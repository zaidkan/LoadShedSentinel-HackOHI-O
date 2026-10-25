import { Box3, MathUtils, Mesh, Vector2, Vector3, type Object3D } from 'three';

/** Bounds of the actual assembly meshes; fading spans are context beyond the subject. */
export function assemblyBounds(root: Object3D): Box3 {
  root.updateWorldMatrix(true, true);
  const bounds = new Box3();
  root.traverse(object => {
    if (!(object instanceof Mesh) || object.name === 'overhead-span') return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return bounds;
}

/** Fit all eight world-space box corners, including camera depth and focal offset. */
export function fitBounds(bounds: Box3, fov: number, aspect: number, azimuth: number, polar: number, offset = { x: 0, y: 0 }) {
  const target = bounds.getCenter(new Vector3());
  const direction = new Vector3().setFromSphericalCoords(1, polar, azimuth);
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const tanV = Math.tan(MathUtils.degToRad(fov) / 2), tanH = tanV * safeAspect;
  const edge = 0.9;
  const x = MathUtils.clamp(offset.x, -0.7, 0.7), y = MathUtils.clamp(offset.y, -0.7, 0.7);
  let distance = 0.1;
  for (const px of [bounds.min.x, bounds.max.x]) for (const py of [bounds.min.y, bounds.max.y]) for (const pz of [bounds.min.z, bounds.max.z]) {
    const corner = new Vector3(px, py, pz).sub(target);
    const dx = corner.dot(right), dy = corner.dot(up), dz = corner.dot(direction);
    distance = Math.max(distance, (dx / tanH + edge * dz) / (edge - x), (-dx / tanH + edge * dz) / (edge + x),
      (dy / tanV + edge * dz) / (edge - y), (-dy / tanV + edge * dz) / (edge + y), dz + 0.1);
  }
  return { target, distance, position: target.clone().addScaledVector(direction, distance),
    focal: new Vector2(-x * distance * tanH, y * distance * tanV) };
}
