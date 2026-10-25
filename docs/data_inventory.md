# Data inventory

## Public runtime sample

The checked-in `data/processed/network_bundle.json` contains 16 anonymous premise paths, 12 equipment nodes, 27 ordered relationships, and 52 approximate critical-facility associations. Runtime dependency counts are computed from this sample. Equipment coordinates are generalized to a 0.02-degree grid; household coordinates are not included.

## Offline coverage

`data/processed/graph_summary.json` records the full supplied-extract processing result:

| Measure | Count |
| --- | ---: |
| Customer rows | 117,642 |
| Supplied text paths | 117,599 |
| Accepted complete premise paths | 117,549 |
| Unmatched customer premises | 93 |
| Text-only keys without customer records | 4 |
| Equipment nodes | 32,600 |
| Supplied relational edges | 32,543 |
| Equipment with multiple upstream parents | 60 |

These are extract-coverage statistics, not runtime sample size, a whole-territory inventory, or an observed outage count. Missing and ambiguous joins remain unknown.

## Source layers

The machine-readable field inventory is [inventory.json](../data/processed/inventory.json). Record counts are source records, not guaranteed unique physical assets.

| Layer | Records | Use |
| --- | ---: | --- |
| Customer_Clip | 117,642 | Private premise and transformer/circuit joins |
| Transformer_Clip | 26,959 | Supplied-path equipment and generalized geometry |
| Pole_Clip | 107,013 | Inventory; no inferred premise connectivity |
| Primary_ExportFeatures | 62,788 | Line inventory; not inferred dependency edges |
| Secondary_ExportFeatures | 127,403 | Line inventory; not inferred dependency edges |
| Fuse_Bank_Clip | 7,616 | Provided-path protection context |
| Recloser_Bank_Clip | 331 | Provided-path protection context |
| Switch_Clip | 900 | Exact source matching where supported |
| arcos_prod_damage_09_28_Clip | 1,659 | Historical assessment context |
| Hospitals_Medic_Pairwis_Clip | 5 | Approximate sample-anchor association |
| Fire_Stations_E_Pairwis_Clip | 37 | Approximate sample-anchor association |
| Ambulance_Servi_Pairwis_Clip | 10 | Approximate sample-anchor association |

The three facility layers use EPSG:3857 horizontal coordinates with a separate NAVD88 elevation declaration. Matching reprojects horizontal positions to EPSG:4326; elevation is not used. Facilities are associated with the nearest geolocated transformer within the selected slice, including distant matches without a cutoff. Associations are assumptions, not electrical service joins or verified emergency availability.

## Source integrity

The source package hashes are retained in the public bundle metadata.

| Archive | SHA-256 |
| --- | --- |
| Data1.zip | `08ac47b7dd7f43cde56509644d7292d0b6978dcd62300912b4ecf0a2c3c6eca3` |
| Data2.zip | `13bea1c84636989a6475f481d67f25b25a17fcac8b77f674a5157e3a1d105f00` |
| matched_upstream.zip | `13f8d9da49843c959059b4074417c47671105131cdc4bfe9daf7b534e5f522c3` |

The supplied workbook hash is `e11fb199592bf26ef7f6e0bd11fab3de00265cde7649fc9b9a0cd54fc2e96e3b`. See the [source ledger](source_ledger.md) and [model reference](models.md) for interpretation.

## Privacy and unknowns

The private graph retains source technical identifiers and is not a public export. Never serve `data/processed/private/` or the entire processed-data directory. Public maps show generalized equipment and schematic relationships, not surveyed conductor geometry, household locations, or live energization.

Paths terminate at supplied circuit breakers. Reported station labels do not establish physical substation connectivity. Historical damage circuit labels and `NEAR_FID` do not provide a verified automatic damage-to-selected-asset crosswalk.
