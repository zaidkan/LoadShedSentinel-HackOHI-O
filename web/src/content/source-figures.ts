/** Offline preprocessing results, copied from data/processed/graph_summary.json (AEP challenge source). */
export const SOURCE_FIGURES = [
  { label: 'Customer rows in the source', value: 117_642 },
  { label: 'Premise paths accepted', value: 117_549 },
  { label: 'Premises rejected by validation', value: 97 },
  { label: 'Transformers', value: 26_959 },
  { label: 'Fuse banks', value: 7_616 },
  { label: 'Recloser banks', value: 331 },
  { label: 'Switches', value: 900 },
  { label: 'Equipment nodes in the graph', value: 32_600 },
  { label: 'Relational edges', value: 32_543 },
] as const;
