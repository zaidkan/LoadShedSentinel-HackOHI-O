"""Runtime graph bootstrap checks using tiny source ZIPs, without private data in Git."""
import json
from pathlib import Path
from zipfile import ZipFile

import pytest

from engine.topology import Topology
from pipeline.build_graph import ensure_runtime_data
from test_topology import fixture_archives


@pytest.fixture
def runtime_dirs(tmp_path):
    source = tmp_path / "raw"
    source.mkdir()
    fixture_archives(source)
    return source, tmp_path / "processed"


def test_runtime_bootstrap_builds_private_graph_and_safe_public_outputs(runtime_dirs):
    source, output = runtime_dirs
    result = ensure_runtime_data(data_dir=source, output_dir=output)

    assert result["reused"] is False
    assert isinstance(result["topology_path"], str)
    topology_path = Path(result["topology_path"])
    assert topology_path == output / "private" / "topology.json"
    assert topology_path.is_file()
    topology = Topology.load(topology_path)
    assert topology.premise_to_substation("PREM-000001")["status"] == "KNOWN"
    assert result["summary"]["matched_premises"] == 3
    assert result["public_slice_status"] == "KNOWN"

    for name in ("inventory.json", "graph_summary.json", "network.geojson", "source_context.json", "risk_context.json", "source_manifest.json"):
        public_path = output / name
        assert public_path.is_file()
        public_text = public_path.read_text(encoding="utf-8")
        json.loads(public_text)
        for private_value in ("PRIVATE-PREMISE-", "PRIVATE-ADDRESS", "PRIVATE-MEDICAL", "LOC-0001", "STATION-X", "37.123456"):
            assert private_value not in public_text

    public_map = json.loads((output / "network.geojson").read_text(encoding="utf-8"))
    assert public_map["status"] == "KNOWN"
    assert public_map["selected_premise_token"] == "PREM-000001"
    assert public_map["features"]


def test_runtime_bootstrap_reuses_graph_only_with_same_source_archives(runtime_dirs):
    source, output = runtime_dirs
    first = ensure_runtime_data(data_dir=source, output_dir=output)
    persisted = Path(first["topology_path"]).read_bytes()

    second = ensure_runtime_data(data_dir=source, output_dir=output)

    assert second["reused"] is True
    assert second["topology_path"] == first["topology_path"]
    assert second["summary"] == first["summary"]
    assert second["public_slice_status"] == "KNOWN"
    assert Path(second["topology_path"]).read_bytes() == persisted


def test_same_source_archives_produce_identical_public_artifacts(runtime_dirs):
    source, output = runtime_dirs
    other_output = output.with_name("processed-again")
    ensure_runtime_data(data_dir=source, output_dir=output)
    ensure_runtime_data(data_dir=source, output_dir=other_output)
    for name in ("inventory.json", "graph_summary.json", "network.geojson", "source_context.json", "risk_context.json", "source_manifest.json"):
        assert (output / name).read_bytes() == (other_output / name).read_bytes()


def test_runtime_bootstrap_recovers_missing_public_map_without_rebuilding_valid_graph(runtime_dirs):
    source, output = runtime_dirs
    first = ensure_runtime_data(data_dir=source, output_dir=output)
    persisted = Path(first["topology_path"]).read_bytes()
    (output / "network.geojson").unlink()

    recovered = ensure_runtime_data(data_dir=source, output_dir=output)

    assert recovered["reused"] is True
    assert recovered["public_slice_status"] == "KNOWN"
    assert Path(recovered["topology_path"]).read_bytes() == persisted
    assert json.loads((output / "network.geojson").read_text(encoding="utf-8"))["status"] == "KNOWN"


def test_runtime_bootstrap_republishes_mixed_public_output_while_reusing_private_graph(runtime_dirs):
    source, output = runtime_dirs
    first = ensure_runtime_data(data_dir=source, output_dir=output)
    persisted = Path(first["topology_path"]).read_bytes()
    public_path = output / "network.geojson"
    original = json.loads(public_path.read_text(encoding="utf-8"))
    altered = {**original, "features": [], "selected_premise_token": "STALE-PUBLIC-TOKEN"}
    public_path.write_text(json.dumps(altered), encoding="utf-8")

    recovered = ensure_runtime_data(data_dir=source, output_dir=output)

    assert recovered["reused"] is True
    assert Path(recovered["topology_path"]).read_bytes() == persisted
    assert json.loads(public_path.read_text(encoding="utf-8")) == original


def test_runtime_bootstrap_rebuilds_after_source_archive_changes(runtime_dirs):
    source, output = runtime_dirs
    first = ensure_runtime_data(data_dir=source, output_dir=output)
    archive_path = source / "matched_upstream.zip"
    with ZipFile(archive_path) as archive:
        text = archive.read("matched_upstream.txt").decode("utf-8")
    # Remove an actual relationship, not just a ZIP timestamp: stale reuse would
    # keep claiming a path that no longer exists in the supplied source records.
    changed = "".join(line for line in text.splitlines(keepends=True)
                      if not line.startswith("PRIVATE-PREMISE-0002\t"))
    assert changed != text
    with ZipFile(archive_path, "w") as archive:
        archive.writestr("matched_upstream.txt", changed)

    rebuilt = ensure_runtime_data(data_dir=source, output_dir=output)

    assert rebuilt["reused"] is False
    assert rebuilt["topology_path"] == first["topology_path"]
    assert rebuilt["summary"]["matched_premises"] == 2
    topology = Topology.load(rebuilt["topology_path"])
    assert topology.premise_to_substation("PRIVATE-PREMISE-0002")["status"] == "UNKNOWN"
    assert topology.premise_to_substation("PRIVATE-PREMISE-0001")["status"] == "KNOWN"


def test_runtime_bootstrap_rejects_corrupt_persisted_tokens_without_serving_or_replacing(runtime_dirs):
    source, output = runtime_dirs
    initial = ensure_runtime_data(data_dir=source, output_dir=output)
    path = Path(initial["topology_path"])
    graph = json.loads(path.read_text(encoding="utf-8"))
    node_keys = list(graph["nodes"])
    assert len(node_keys) >= 2
    graph["nodes"][node_keys[1]]["asset_token"] = graph["nodes"][node_keys[0]]["asset_token"]
    path.write_text(json.dumps(graph), encoding="utf-8")
    corrupted = path.read_bytes()

    with pytest.raises(ValueError):
        ensure_runtime_data(data_dir=source, output_dir=output)

    assert path.read_bytes() == corrupted
