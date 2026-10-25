import type { ScenarioSnapshot } from '../../../../contracts/types';
import { PROVENANCE, QUALITY, evidenceValue, humanize, numberText, utcText } from './presentation';

export function EvidencePanel({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const evidenceById = new Map(snapshot.evidence.map(e => [e.id, e]));
  const gaps = [...new Set(snapshot.hypotheses.flatMap(h => h.missing_evidence))];
  const conflicts = new Set(snapshot.hypotheses.flatMap(h => h.contradicting_evidence_ids)).size;
  const evidenceList = (ids: string[]) => ids.length ? <ul className="utility-reference-list">{ids.map(id => <li key={id}><code>{id}</code> {evidenceById.has(id) ? `${humanize(evidenceById.get(id)!.kind)}: ${evidenceValue(evidenceById.get(id)!.value)}` : 'Referenced evidence not supplied'}</li>)}</ul> : <p className="utility-muted">None supplied.</p>;

  return <div className="utility-assessment-grid">
    <section className="utility-panel utility-hypotheses" aria-labelledby="utility-hypotheses-heading">
      <div className="utility-panel-heading"><h3 id="utility-hypotheses-heading">Working hypotheses</h3><span className="utility-badge utility-badge-caution">{snapshot.status === 'UNDER_REVIEW' ? 'Review hold' : 'Assessment'}</span></div>
      <p className="utility-panel-intro">{snapshot.status === 'UNDER_REVIEW' ? 'Conflicting or insufficient evidence. No repair duration or affected count is asserted.' : 'Supplied assessment of this simulated incident. Scores describe evidence, not outage probability.'}</p>
      {snapshot.hypotheses.length ? snapshot.hypotheses.map(h => <article className="utility-hypothesis" key={h.code}>
        <h4>{h.label}</h4>
        <p className="utility-hypothesis-score">{h.score_type === 'calibrated_probability' && h.score !== null && Number.isFinite(h.score) && h.score >= 0 && h.score <= 1 ? `Calibrated probability · ${numberText(h.score * 100)}%` : h.score_type === 'relative_evidence' && h.score !== null && Number.isFinite(h.score) ? `Relative evidence score · ${numberText(h.score, 2)}` : 'Score unavailable'}</p>
        <p className={h.requires_field_confirmation ? 'utility-caution' : 'utility-muted'}>{h.requires_field_confirmation ? 'Requires field confirmation' : h.supporting_evidence_ids.some(id => evidenceById.get(id)?.provenance === 'scenario' && evidenceById.get(id)?.quality === 'field_confirmed') ? 'Confirmation supplied by demonstration scenario' : 'Confirmation requirement: see supplied evidence'}</p>
        <details><summary>Review evidence & gaps</summary>
          <h5>Supporting evidence</h5>{evidenceList(h.supporting_evidence_ids)}
          <h5>Contradicting evidence</h5>{evidenceList(h.contradicting_evidence_ids)}
          <h5>Missing evidence</h5>{h.missing_evidence.length ? <ul>{h.missing_evidence.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="utility-muted">None listed.</p>}
        </details>
      </article>) : <p className="utility-empty">No hypotheses supplied. Request a qualified field assessment before choosing repair work.</p>}
    </section>
    <aside className="utility-evidence-review" aria-label="Uncertainty and source records">
      <div className="utility-gap-summary">
        <h3>What still needs verification?</h3>
        {gaps.length ? <ul>{gaps.map(gap => <li key={gap}>{gap}</li>)}</ul> : <p>{snapshot.hypotheses.length ? 'No missing evidence listed in the supplied assessment. Review the source records before approval.' : 'Evidence requirements have not been supplied.'}</p>}
        {conflicts > 0 && <p className="utility-caution">{conflicts} referenced evidence records contradict the assessment. Resolve them before repair selection.</p>}
      </div>
      <details className="utility-records">
        <summary>Incident evidence <span>{snapshot.evidence.length} records</span></summary>
        <p className="utility-muted">Quality, source and timestamp stay attached to every record. Scenario confirmation is simulated.</p>
        {snapshot.evidence.length ? <ol className="utility-evidence-list">{snapshot.evidence.map(e => <li key={e.id}>
          <div className="utility-evidence-title"><span>{humanize(e.kind)}</span><code>{e.id}</code></div>
          <div className="utility-evidence-value">{evidenceValue(e.value)}{e.unit && e.value !== null ? <small> {e.unit}</small> : null}</div>
          <div className="utility-meta-line"><span>{QUALITY[e.quality]}</span><span>{PROVENANCE[e.provenance]}</span></div>
          <div className="utility-evidence-meta"><time dateTime={e.timestamp_utc}>{utcText(e.timestamp_utc)}</time><span>{e.asset_id || 'Incident-wide'} · {humanize(e.visibility)}</span></div>
        </li>)}</ol> : <p className="utility-empty">No evidence records supplied. Cause and field condition remain unverified.</p>}
      </details>
    </aside>
  </div>;
}
