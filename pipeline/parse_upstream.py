"""Strict reader for headerless, tab-separated premise-to-upstream records."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile


@dataclass(frozen=True)
class EquipmentToken:
    source_class: str
    source_id: str
    kind: str
    location: str

    @classmethod
    def parse(cls, text: str):
        parts = tuple(p.strip() for p in text.split("*"))
        if len(parts) != 4 or not all(parts):
            raise ValueError("Equipment token requires class*id*kind*location")
        if parts[0] not in {"eo_power_xfrmr_inst", "eo_isolating_eqpt_inst", "eo_circuit"}:
            raise ValueError("Unsupported source class")
        return cls(*parts)

    @property
    def raw(self):
        return "*".join((self.source_class, self.source_id, self.kind, self.location))


@dataclass(frozen=True)
class UpstreamPath:
    premise: str
    equipment: tuple[EquipmentToken, ...]
    line: int


def parse_lines(lines) -> tuple[dict[str, UpstreamPath], dict]:
    accepted = {}
    rejected = []
    conflicting = set()
    duplicate_rows = 0
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        parts = line.strip("\r\n\ufeff").split("\t")
        premise = parts[0].strip()
        try:
            equipment = tuple(EquipmentToken.parse(p) for p in parts[1:])
            if not premise or len(equipment) < 2 or len(set(equipment)) != len(equipment):
                raise ValueError("Missing premise, short path, or repeated equipment")
            if (equipment[0].source_class != "eo_power_xfrmr_inst" or equipment[0].kind != "Distribution"
                    or equipment[-1].source_class != "eo_circuit"):
                raise ValueError("Path must start at distribution transformer and end at circuit equipment")
            path = UpstreamPath(premise, equipment, number)
            if premise in accepted:
                if accepted[premise].equipment != equipment:
                    conflicting.add(premise)
                else:
                    duplicate_rows += 1
            else:
                accepted[premise] = path
        except ValueError as exc:
            rejected.append({"line": number, "reason": str(exc)})
            if premise:
                conflicting.add(premise)
    for premise in conflicting:
        accepted.pop(premise, None)
    return accepted, {"accepted_paths": len(accepted), "duplicate_rows": duplicate_rows,
                      "conflicting_premises": len(conflicting), "rejected_rows": rejected}


def read_upstream(raw: Path):
    with ZipFile(raw / "matched_upstream.zip") as archive:
        names = [n for n in archive.namelist() if Path(n).name == "matched_upstream.txt"]
        if len(names) != 1:
            raise ValueError("Expected one matched_upstream.txt")
        return parse_lines(archive.read(names[0]).decode("utf-8-sig").splitlines())
