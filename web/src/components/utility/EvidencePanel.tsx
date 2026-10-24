import type { ScenarioSnapshot } from '../../../../contracts/types';
import { PROVENANCE, QUALITY, evidenceValue, humanize, numberText, utcText } from './presentation';

export function EvidencePanel({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const evidenceById = new Map(snapshot.evidence.map(e => [e.id, e]));
  const evidenceList = (ids: string[]) => ids.length ? <ul className="utility-reference-list">{ids.map(id => <li key={id}><code>{id}</code> {evidenceById.has(id) ? `${humanize(evidenceById.get(id)!.kind)}: ${evidenceValue(evidenceById.get(id)!.value)}` : 'Referenced evidence not supplied'}</li>)}</ul> : <p className="utility-muted">None supplied.</p>;
  return <div className="utility-assessment-column">
    <section className="utility-panel utility-evidence" aria-labelledby="utility-evidence-heading">
      <div className="utility-panel-heading"><h2 id="utility-evidence-heading">Incident evidence</h2><span className="utility-badge utility-badge-neutral">{snapshot.evidence.length} records</span></div>
      {snapshot.evidence.length ? <ol className="utility-evidence-list">{snapshot.evidence.map(e => <li key={e.id}>
        <div className="utility-evidence-title"><span>{humanize(e.kind)}</span><code>{e.id}</code></div>
        <div className="utility-evidence-value">{evidenceValue(e.value)}{e.unit && e.value !== null ? <small> {e.unit}</small> : null}</div>
        <div className="utility-meta-line"><span>{QUALITY[e.quality]}</span><span>{PROVENANCE[e.provenance]}</span></div>
        <div className="utility-evidence-meta"><time dateTime={e.timestamp_utc}>{utcText(e.timestamp_utc)}</time><span>{e.asset_id || 'Incident-wide'} · {humanize(e.visibility)}</span></div>
      </li>)}</ol> : <p className="utility-empty">No evidence supplied for this snapshot.</p>}
    </section>
    <section className="utility-panel utility-hypotheses" aria-labelledby="utility-hypotheses-heading">
      <div className="utility-panel-heading"><h2 id="utility-hypotheses-heading">Working hypotheses</h2><span className="utility-badge utility-badge-caution">Assessment</span></div>
      {snapshot.hypotheses.length ? snapshot.hypotheses.map(h => <article className="utility-hypothesis" key={h.code}>
        <h3>{h.label}</h3>
        <p className="utility-hypothesis-score">{h.score_type === 'calibrated_probability' && h.score !== null && Number.isFinite(h.score) && h.score >= 0 && h.score <= 1 ? `Calibrated probability · ${numberText(h.score * 100)}%` : h.score_type === 'relative_evidence' && h.score !== null && Number.isFinite(h.score) ? `Relative evidence score · ${numberText(h.score, 2)}` : 'Score unavailable'}</p>
        {h.requires_field_confirmation ? <p className="utility-caution">Requires field confirmation</p> : null}
        <details><summary>Review evidence & gaps</summary>
          <h4>Supporting evidence</h4>{evidenceList(h.supporting_evidence_ids)}
          <h4>Contradicting evidence</h4>{evidenceList(h.contradicting_evidence_ids)}
          <h4>Missing evidence</h4>{h.missing_evidence.length ? <ul>{h.missing_evidence.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">None listed.</p>}
        </details>
      </article>) : <p className="utility-empty">No hypotheses supplied. Cause remains unassessed.</p>}
    </section>
  </div>;
}
