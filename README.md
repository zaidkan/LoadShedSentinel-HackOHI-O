# LoadShed Sentinel — HackOHI/O 2026

Transformer-monitoring concept and customer outage concierge using AEP challenge GIS, upstream topology, damage records and labor references.

## Current implementation plan

Read [FINAL_LOADSHET_IMPLEMENTATION.md](FINAL_LOADSHET_IMPLEMENTATION.md). It is the canonical blueprint; other project-plan documents are earlier context.

The latest plan adds verified source counts and join coverage, selected-home supply paths, asset-failure impact simulation, multiple-fault restoration playback, repair calculation provenance, and acceptance gates assigned to the four teammates. Historical overlays and neighbor comparison follow the core vertical slice.

## Challenge data

Source archives, labor workbook and organizer documents are under [aep_challenge_hack26/](aep_challenge_hack26/). Extraction instructions are in [data/README.md](aep_challenge_hack26/data/README.md).

## Implementation status

This repository currently contains planning documents and challenge source files. The planned application and acceptance tests are not implemented. Sensor streams, operational faults and crew conditions in the proposed demo are simulated; supplied GIS/topology and labor references provide the data context.
