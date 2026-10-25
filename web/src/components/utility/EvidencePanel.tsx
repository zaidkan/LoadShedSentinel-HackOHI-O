import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Evidence, Hypothesis, ScenarioSnapshot } from '../../../../contracts/types';
import { PROVENANCE, QUALITY, evidenceValue, numberText, sentenceCase, tokenTail, utcShort, utcText } from './presentation';

type Focus = { type: 'hypothesis'; code: string } | { type: 'evidence'; id: string } | null;
type Link = 'supports' | 'contradicts' | 'both' | 'none';

const shortId = (id: string) => id.split(':').pop() ?? id;

function linkOf(hypothesis: Hypothesis, evidenceId: string): Link {
  const supports = hypothesis.supporting_evidence_ids.includes(evidenceId);
  const contradicts = hypothesis.contradicting_evidence_ids.includes(evidenceId);
  return supports && contradicts ? 'both' : supports ? 'supports' : contradicts ? 'contradicts' : 'none';
}

const scored = (h: Hypothesis) => h.score !== null && Number.isFinite(h.score) && h.score_type !== 'unavailable';

function ScoreBar({ hypothesis, max }: { hypothesis: Hypothesis; max: number }) {
  if (!scored(hypothesis)) return <p className="hyp-score" data-empty="true"><span className="hyp-bar" aria-hidden="true" /><span>Score unavailable</span></p>;
  const score = hypothesis.score!;
  const probability = hypothesis.score_type === 'calibrated_probability' && score >= 0 && score <= 1;
  const fraction = probability ? score : max > 0 ? score / max : 0;
  return <p className="hyp-score">
    <span className="hyp-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, fraction * 100)}%` }} /></span>
    <span><span className="mono">{probability ? `${numberText(score * 100)}%` : numberText(score, 2)}</span> {probability ? 'calibrated' : 'relative'}</span>
  </p>;
}

function EvidenceChips({ ids, evidence, onFocus }: { ids: string[]; evidence: Map<string, Evidence>; onFocus: (focus: Focus) => void }) {
  if (!ids.length) return <p className="muted small">None supplied.</p>;
  return <ul className="evidence-chips">{ids.map(id => {
    const record = evidence.get(id);
    return <li key={id}>
      <button type="button" className="evidence-chip" onMouseEnter={() => onFocus({ type: 'evidence', id })} onMouseLeave={() => onFocus(null)} onFocus={() => onFocus({ type: 'evidence', id })} onBlur={() => onFocus(null)}
        onClick={() => document.getElementById(`evidence-${id}`)?.scrollIntoView({ block: 'nearest' })}>
        <span className="mono">{shortId(id)}</span>
        {record ? `${sentenceCase(record.kind)}: ${evidenceValue(record.value)}` : 'Referenced record not supplied'}
      </button>
    </li>;
  })}</ul>;
}

export function EvidencePanel({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const uid = useId();
  const [focus, setFocus] = useState<Focus>(null);
  const [open, setOpen] = useState<string | null>(snapshot.hypotheses[0]?.code ?? null);
  const evidence = new Map(snapshot.evidence.map(e => [e.id, e]));
  // Supplied order is authoritative: an abstention leads even when it carries no score.
  const ranked = snapshot.hypotheses;
  const max = Math.max(0, ...ranked.filter(h => h.score_type === 'relative_evidence' && scored(h)).map(h => h.score!));
  const focusHypothesis = focus?.type === 'hypothesis' ? snapshot.hypotheses.find(h => h.code === focus.code) : undefined;
  const rowLink = (id: string): Link | undefined => focusHypothesis ? linkOf(focusHypothesis, id) : focus?.type === 'evidence' ? (focus.id === id ? 'supports' : 'none') : undefined;
  const hypothesisLink = (h: Hypothesis): Link | undefined => focus?.type === 'evidence' ? linkOf(h, focus.id) : focus?.type === 'hypothesis' ? (focus.code === h.code ? 'supports' : 'none') : undefined;
  const hasProbability = ranked.some(h => h.score_type === 'calibrated_probability');

  return <div className="assessment" data-focus={focus ? 'true' : 'false'}>
    <section className="console-block" aria-labelledby="hypotheses-heading">
      <header className="block-head">
        <h2 id="hypotheses-heading" className="console-h2" tabIndex={-1}><em>Working</em> hypotheses</h2>
        <p className="block-sub">In the order the assessment engine supplies them. {hasProbability ? 'Calibrated probabilities where supplied; other scores are relative.' : 'Scores compare hypotheses within this incident; they are not probabilities.'}</p>
      </header>
      {ranked.length ? <ol className="hyp-list">{ranked.map((h, index) => {
        const expanded = open === h.code;
        const panelId = `${uid}-${h.code}`;
        return <li key={h.code} className="hyp" data-link={hypothesisLink(h)} data-leading={index === 0 ? 'true' : undefined}
          onMouseEnter={() => setFocus({ type: 'hypothesis', code: h.code })} onMouseLeave={() => setFocus(null)}>
          <h3 className="hyp-label">
            <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : h.code)}
              onFocus={() => setFocus({ type: 'hypothesis', code: h.code })} onBlur={() => setFocus(null)}>
              <span>{h.label}</span><ChevronDown aria-hidden="true" />
            </button>
          </h3>
          <ScoreBar hypothesis={h} max={max} />
          <p className="hyp-meta">
            <span className="mono">{h.code}</span>
            <span className="hyp-counts">
              <span><strong>{h.supporting_evidence_ids.length}</strong> supporting</span>
              <span><strong>{h.contradicting_evidence_ids.length}</strong> contradicting</span>
              <span><strong>{h.missing_evidence.length}</strong> missing</span>
            </span>
            {h.requires_field_confirmation ? <span className="state" data-state="open">Field confirmation required</span> : null}
          </p>
          <div id={panelId} className="hyp-details" hidden={!expanded}>
            <div><h4>Supporting</h4><EvidenceChips ids={h.supporting_evidence_ids} evidence={evidence} onFocus={setFocus} /></div>
            <div><h4>Contradicting</h4><EvidenceChips ids={h.contradicting_evidence_ids} evidence={evidence} onFocus={setFocus} /></div>
            <div><h4>Missing</h4>{h.missing_evidence.length ? <ul className="hyp-missing">{h.missing_evidence.map((item, i) => <li key={i}>{sentenceCase(item)}</li>)}</ul> : <p className="muted small">None listed.</p>}</div>
          </div>
        </li>;
      })}</ol> : <p className="empty-line">No hypotheses supplied. Cause remains unassessed.</p>}
    </section>

    <section className="console-block" aria-labelledby="evidence-heading">
      <header className="block-head">
        <h2 id="evidence-heading" className="console-h2"><em>Evidence</em> ledger</h2>
        <p className="block-sub">{snapshot.evidence.length} {snapshot.evidence.length === 1 ? 'record' : 'records'} as supplied. Hover a hypothesis to see which records it rests on.</p>
      </header>
      {snapshot.evidence.length ? <table className="ledger-table">
        <thead><tr><th scope="col">Record</th><th scope="col">Reading</th><th scope="col">Source</th><th scope="col">Asset · time</th></tr></thead>
        <tbody>{snapshot.evidence.map(e => {
          const link = rowLink(e.id);
          return <tr key={e.id} id={`evidence-${e.id}`} data-link={link} title={e.id}>
            <th scope="row"><span className="mono">{shortId(e.id)}</span>{link && link !== 'none' ? <span className="ledger-link">{link === 'both' ? 'Supports and contradicts' : sentenceCase(link)}</span> : null}</th>
            <td data-label="Reading"><span className="ledger-kind">{sentenceCase(e.kind)}</span><strong className="ledger-value">{evidenceValue(e.value)}{e.unit && e.value !== null ? <small> {e.unit}</small> : null}</strong></td>
            <td data-label="Source"><span className="tag" data-source={e.provenance}>{PROVENANCE[e.provenance]}</span><span className="ledger-quality" data-quality={e.quality}>{QUALITY[e.quality]} · {sentenceCase(e.visibility)}</span></td>
            <td data-label="Asset · time"><span className="mono">{e.asset_id ? tokenTail(e.asset_id) : 'Incident-wide'}</span><time className="mono" dateTime={e.timestamp_utc} title={utcText(e.timestamp_utc)}>{utcShort(e.timestamp_utc)}</time></td>
          </tr>;
        })}</tbody>
      </table> : <p className="empty-line">No evidence supplied for this snapshot.</p>}
    </section>
  </div>;
}
