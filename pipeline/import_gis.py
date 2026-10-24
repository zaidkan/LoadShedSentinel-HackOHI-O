"""Read source archives without extracting or modifying them; export by allowlist."""
from __future__ import annotations

from collections import Counter, defaultdict
from contextlib import contextmanager
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from math import isfinite
from pathlib import Path
from zipfile import ZipFile

import shapefile
from pyproj import CRS, Transformer


LAYERS = {
    "customers": ("Data1.zip", "Customer_Clip"),
    "transformers": ("Data2.zip", "Transformer_Clip"),
    "fuses": ("Data1.zip", "Fuse_Bank_Clip"),
    "switches": ("Data2.zip", "Switch_Clip"),
    "reclosers": ("Data2.zip", "Recloser_Bank_Clip"),
    "poles": ("Data1.zip", "Pole_Clip"),
    "primary": ("Data1.zip", "Primary_ExportFeatures"),
    "secondary": ("Data2.zip", "Secondary_ExportFeatures"),
    "damage": ("Data1.zip", "arcos_prod_damage_09_28_Clip"),
    "hospitals": ("Data1.zip", "Hospitals_Medic_Pairwis_Clip"),
    "fire": ("Data1.zip", "Fire_Stations_E_Pairwis_Clip"),
    "ambulance": ("Data1.zip", "Ambulance_Servi_Pairwis_Clip"),
}
KEY_FIELDS = {"premise_nu", "location_n", "id", "circuit_id", "eo_source_", "aep_xfmr_l"}


def key(value) -> str:
    """Do not cast identifiers to numbers or drop leading zeroes."""
    return "" if value is None else str(value).strip()


def fingerprint(path: Path) -> str:
    with path.open("rb") as stream:
        return sha256(stream.read()).hexdigest()


def wgs84_transform(wkt: str) -> Transformer:
    if not wkt.strip():
        raise ValueError("Missing source CRS; coordinate guessing is disabled")
    return Transformer.from_crs(CRS.from_wkt(wkt), CRS.from_epsg(4326), always_xy=True)


def project_point(point, transform: Transformer) -> list[float]:
    lon, lat = transform.transform(*point[:2], errcheck=True)
    if not (isfinite(lon) and isfinite(lat) and -180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("Coordinates outside WGS84 bounds")
    return [lon, lat]


def generalize(point: list[float], grid_degrees: float = 0.02) -> list[float]:
    """Public demo uses coarse source geometry, never exact household positions."""
    if not isfinite(grid_degrees) or grid_degrees < 0.02:
        raise ValueError("Public grid must be at least 0.02 degrees")
    return [round(round(v / grid_degrees) * grid_degrees, 6) for v in point]


@dataclass
class Layer:
    name: str
    reader: shapefile.Reader
    crs: CRS
    transform: Transformer
    fields: list[str]

    def rows(self, selected: set[str] | None = None, geometry: bool = False):
        fields = self.fields if selected is None else [f for f in self.fields if f in selected]
        if geometry:
            for ordinal, feature in enumerate(self.reader.iterShapeRecords(fields=fields)):
                yield ordinal, feature.record.as_dict(), feature.shape
        else:
            for ordinal, record in enumerate(self.reader.iterRecords(fields=fields)):
                yield ordinal, record.as_dict(), None


@contextmanager
def open_layer(raw: Path, name: str):
    archive, stem = LAYERS[name]
    with ZipFile(raw / archive) as source:
        def member(ext):
            matches = [n for n in source.namelist() if Path(n).name.lower() == (stem + ext).lower()]
            if len(matches) != 1:
                raise ValueError(f"Expected one {stem}{ext}; found {len(matches)}")
            return source.read(matches[0])

        wkt = member(".prj").decode("utf-8-sig")
        transform = wgs84_transform(wkt)
        with shapefile.Reader(shp=BytesIO(member(".shp")), shx=BytesIO(member(".shx")),
                              dbf=BytesIO(member(".dbf")), encoding="latin1") as reader:
            yield Layer(name, reader, CRS.from_wkt(wkt), transform, [f[0] for f in reader.fields[1:]])


def inspect_layer(raw: Path, name: str) -> dict:
    with open_layer(raw, name) as layer:
        missing = Counter()
        unique = {f: Counter() for f in layer.fields if f in KEY_FIELDS}
        for _, row, _ in layer.rows():
            for field, value in row.items():
                if value is None or isinstance(value, str) and not value.strip():
                    missing[field] += 1
                elif field in unique:
                    unique[field][key(value)] += 1
        return {
            "layer": name, "source": LAYERS[name][1], "rows": len(layer.reader),
            "geometry": layer.reader.shapeTypeName,
            "crs": layer.crs.to_string(), "fields": layer.fields,
            "missing_counts": {f: missing[f] for f in layer.fields},
            "keys": {f: {"distinct_nonempty": len(c), "duplicate_keys": sum(n > 1 for n in c.values())}
                     for f, c in unique.items()},
        }


class AssetIndex:
    """Class + ID + location validation; never accept a class-only or row-order join."""

    def __init__(self, records: list[dict]):
        self.by_pair = defaultdict(list)
        self.by_location = defaultdict(list)
        for row in records:
            self.by_pair[(key(row.get("eo_source_")).casefold(), key(row.get("id")))].append(row)
            location = key(row.get("location_n"))
            if location:
                self.by_location[location].append(row)

    def resolve(self, token) -> tuple[dict | None, str]:
        candidates = self.by_pair.get((token.source_class.casefold(), token.source_id), [])
        if not candidates:
            return None, "UNMAPPED"
        matches = [r for r in candidates if key(r.get("location_n")) == token.location]
        if len(matches) == 1:
            return matches[0], "CLASS_ID_LOCATION"
        return None, "AMBIGUOUS" if len(matches) > 1 else "LOCATION_MISMATCH"

    def transformer_for_customer(self, customer: dict) -> tuple[dict | None, str]:
        location = key(customer.get("aep_xfmr_l"))
        candidates = [r for r in self.by_location.get(location, []) if r.get("layer") == "transformers"]
        if not candidates:
            return None, "UNMAPPED"
        circuit = key(customer.get("circuit_id"))
        compatible = [r for r in candidates if circuit and key(r.get("circuit_id")) == circuit]
        if len(compatible) == 1:
            return compatible[0], "LOCATION_CIRCUIT"
        if len(compatible) > 1 or len(candidates) > 1:
            return None, "AMBIGUOUS"
        return None, "CIRCUIT_MISMATCH"


def load_assets(raw: Path) -> list[dict]:
    assets = []
    selected = {"eo_source_", "id", "location_n", "circuit_id", "device_typ", "type"}
    for name in ("transformers", "fuses", "switches", "reclosers"):
        with open_layer(raw, name) as layer:
            for ordinal, row, shape in layer.rows(selected, geometry=True):
                row.update(layer=name, ordinal=ordinal, point=project_point(shape.points[0], layer.transform)
                           if shape.points else None)
                assets.append(row)
    return assets
