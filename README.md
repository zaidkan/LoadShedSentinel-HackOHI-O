# LoadShed Sentinel — HackOHI/O 2026

Transformer-monitoring concept and customer outage concierge using AEP challenge GIS, upstream topology, damage records and labor references.

## Run the integration scaffold

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm --prefix web ci
./scripts/dev-api.sh
# In a second terminal:
npm --prefix web run dev
```

Open http://127.0.0.1:5173. Interactive API docs: http://127.0.0.1:8000/docs.

The temporary integration console connects both operator and customer responses to a single revisioned scenario. It includes six clearly labeled synthetic scenarios, staged repairs, consent-controlled demo alerts and a server-filtered customer view. Real grid ingestion, sourced labor/diagnosis services and final 3D/customer pages await the other owners. No messages are sent externally. This in-memory, unauthenticated server is for localhost development only.

## Team handoff

- [Person 4 integration handoff](docs/integration_handoff.md): endpoint contracts, ownership, fixture walkthrough, adapter seams and remaining work.
- [Team assignments](LoadShed-Team-and-Agent-Assignments.md): four human owners and optional fifth coding role.
- [Current implementation blueprint](FINAL_LOADSHET_IMPLEMENTATION.md): product scope and acceptance criteria.
- `api/schemas.py` is authoritative; `.venv/bin/python scripts/export_contract.py` generates TypeScript types, JSON Schema and frontend sample responses under `contracts/`.

## Verify

```sh
./scripts/check.sh
```

## Challenge data

Original archives, labor workbook and organizer documents are preserved under [aep_challenge_hack26/](aep_challenge_hack26/). See [extraction instructions](aep_challenge_hack26/data/README.md). The current fixture demo does not claim these files have been ingested by the app.

## Development disclosure

The repository contains earlier planning and supplied AEP source material. The integration scaffold is hackathon implementation work dated October 24, 2026. Sensor telemetry, crew findings, fault memberships and repair ranges in starter fixtures are synthetic; no field deployment, calibrated prediction accuracy or measured operational benefit is claimed.
