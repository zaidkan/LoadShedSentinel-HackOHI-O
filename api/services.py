"""Integrator-owned adapters; module owners keep their calculation implementations.

Wire owner functions here or inject TeamServices in create_app(services=...).
Never relabel the shipped fixtures as imported AEP data.
"""
from dataclasses import dataclass
from typing import Callable, Protocol
from api.schemas import Risk, RiskRequest, Snapshot

class SnapshotEnricher(Protocol):
    def __call__(self, snapshot: Snapshot) -> Snapshot:
        """Enrich evidence/diagnosis/crew/restoration/energy/risk; preserve identity/state."""
        ...

@dataclass
class TeamServices:
    enrich_snapshot: SnapshotEnricher | None = None
    network: Callable[[str], dict] | None = None
    risk: Callable[[RiskRequest], Risk] | None = None
