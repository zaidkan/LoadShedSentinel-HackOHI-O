import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { ArrowDown, CornerDownRight } from 'lucide-react';
import type { Provenance } from '../../../contracts/types';
import { useIncident } from '../app/incident';
import { useMotion } from '../app/motion';
import { useReveal } from '../app/reveal';
import { navigate } from '../app/router';
import { useSmoothScroll } from '../app/smooth-scroll';
import { SiteFooter } from '../components/shell/SiteFooter';
import { SiteHeader } from '../components/shell/SiteHeader';
import { scenarioName, scenarioQualifier } from '../components/shell/IncidentBar';
import { PROVENANCE, PROVENANCE_NOTE, humanize, numberText, rangeHoursText, scoreText, tokenTail } from '../components/utility/presentation';
import { SOURCE_FIGURES } from '../content/source-figures';
import { incidentHotspots } from '../sentinel/hotspots';
import { SentinelStage, WebGLBoundary, useWebGLSupport } from '../sentinel/SentinelStage';
import type { SentinelPartId } from '../sentinel/types';
import { fetchAEPSource, type AEPSourceSummary, type ScenarioMeta } from '../services/api';
import { CUTOUT_VISUAL } from '../three/visual-state';
import { PoleDiagram } from '../three/PoleDiagram';
import './landing.css';

const HORIZON_POLES = [70, 250, 420, 1030, 1200, 1370];

function Horizon() {
  const tops = HORIZON_POLES.map((x, index) => ({ x, y: 168 + Math.abs(index - 2.5) * 6 }));
  return <svg className="hero-horizon" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d="M0 214C180 188 330 196 520 206S900 222 1080 200 1340 180 1440 192V320H0Z" fill="#2b2365" />
    {tops.slice(0, -1).map((top, index) => {
      const next = tops[index + 1];
      if (next.x - top.x > 400) return null;
      const mid = (top.x + next.x) / 2;
      return <g key={top.x} fill="none" stroke="#221b52" strokeWidth="1.2">
        <path d={`M${top.x - 14} ${top.y + 4}Q${mid} ${top.y + 26} ${next.x - 14} ${next.y + 4}`} />
        <path d={`M${top.x + 14} ${top.y + 4}Q${mid} ${top.y + 28} ${next.x + 14} ${next.y + 4}`} />
      </g>;
    })}
    {tops.map(top => <g key={top.x} fill="#1f1949">
      <rect x={top.x - 1.6} y={top.y} width="3.2" height={232 - top.y} />
      <rect x={top.x - 16} y={top.y + 3} width="32" height="2.4" />
    </g>)}
    <path d="M0 246C240 232 420 240 640 248S1060 262 1240 244 1400 236 1440 240V320H0Z" fill="#17123a" />
    <path d="M0 282C300 270 560 276 760 284S1180 296 1440 280V320H0Z" fill="#0f0c26" />
  </svg>;
}

function Hero({ progress, paused }: { progress: MutableRefObject<number>; paused: boolean }) {
  const { snapshot, connectionError, retry, loading } = useIncident();
  const { reduced } = useMotion();
  const webgl = useWebGLSupport();
  const [failed, setFailed] = useState(false);
  const [hoverPart, setHoverPart] = useState<SentinelPartId | null>(null);
  const [selectedPart, setSelectedPart] = useState<SentinelPartId>('cutout');
  const titleRef = useReveal<HTMLHeadingElement>({ intro: true, delay: 120 });
  const status = snapshot?.cutout_status ?? 'UNKNOWN';
  const hotspots = useMemo(() => incidentHotspots(snapshot), [snapshot]);
  const fallback = <div className="hero-fallback"><PoleDiagram status={status} /></div>;
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-sky" aria-hidden="true"><span className="hero-cloud hero-cloud--a" /><span className="hero-cloud hero-cloud--b" /><span className="hero-cloud hero-cloud--c" /></div>
    <Horizon />
    <div className="hero-stage">
      {!webgl || failed ? fallback : <WebGLBoundary fallback={fallback} onUnavailable={() => setFailed(true)}>
        <SentinelStage
          variant="hero"
          cutoutStatus={status}
          label={`Interactive Sentinel pole model, cutout ${CUTOUT_VISUAL[status].label.toLowerCase()}. Drag to turn it.`}
          reducedMotion={reduced}
          scrollProgress={progress}
          paused={paused}
          hotspots={hotspots}
          activePart={hoverPart ?? selectedPart}
          onPartHover={setHoverPart}
          onPartSelect={setSelectedPart}
          onContextLost={() => setFailed(true)}
        />
      </WebGLBoundary>}
    </div>
    <div className="hero-shade" aria-hidden="true" />
    <div className="hero-incident page">
      {connectionError ? <p className="hero-incident-chip" role="alert">Sentinel API unreachable<button type="button" className="hero-incident-retry" onClick={() => void retry()}>Retry</button></p>
        : snapshot ? <p className="hero-incident-chip" role="status">
          <span className="state" data-state={snapshot.status.toLowerCase()}>{humanize(snapshot.status)}</span>
          <span className="mono">{snapshot.incident_id}</span>
          <span className="hero-incident-note">Simulated on AEP-supplied paths</span>
        </p>
        : <p className="hero-incident-chip" role="status">{loading ? 'Loading incident…' : 'No incident loaded'}</p>}
    </div>
    <div className="hero-copy page">
      <h1 id="hero-title" ref={titleRef} className="display hero-title">
        <span className="mask-line"><span><em>Where</em></span></span>
        <span className="mask-line"><span>grid evidence</span></span>
        <span className="mask-line"><span>becomes decisions</span></span>
        <span className="mask-line"><span>people can trust</span></span>
      </h1>
      <div className="hero-aside">
        <p className="hero-descriptor">Distribution transformer twin and outage concierge, built on anonymized AEP challenge data for HackOHI/O 2026.</p>
        <div className="hero-actions">
          <button type="button" className="btn btn--accent" onClick={() => navigate('/operator')}>Operator console<CornerDownRight aria-hidden="true" /></button>
          <button type="button" className="btn btn--night" onClick={() => navigate('/customer')}>Customer view</button>
        </div>
      </div>
    </div>
    <a className="hero-scroll" href="#overview"><ArrowDown aria-hidden="true" /><span>Scroll</span></a>
  </section>;
}

function Heading({ id, lines, size = 'l' }: { id: string; lines: ReactNode[]; size?: 'l' | 'm' }) {
  const ref = useReveal<HTMLHeadingElement>();
  return <h2 id={id} ref={ref} className={`display display-${size}`}>{lines.map((line, index) => <span className="mask-line" key={index}><span>{line}</span></span>)}</h2>;
}

function Hook() {
  return <CornerDownRight className="hook" aria-hidden="true" />;
}

function Rows({ children, className }: { children: ReactNode; className: string }) {
  const ref = useReveal<HTMLDivElement>();
  return <div ref={ref} data-reveal-kind="clip" className={className}>{children}</div>;
}

function Intro() {
  const ruleRef = useReveal<HTMLDivElement>();
  return <section id="overview" className="intro" aria-labelledby="intro-title" tabIndex={-1}>
    <div className="page intro-grid">
      <Heading id="intro-title" lines={['Every premise', <><Hook />traced to the</>, 'breaker that feeds it']} />
      <div className="intro-body">
        <p className="lead">LoadShed Sentinel follows AEP-supplied upstream paths from a home’s transformer through fuses and reclosers to a circuit breaker. A simulated fault then becomes an evidence-ranked assessment, a review-only work package and plain guidance for the household.</p>
        <p>Where the source stops, the interface stops too. Substation connectivity stays unknown, crew approval stays false, and every restoration figure is a planning range rather than a promise.</p>
      </div>
      <figure className="ledger">
        <div ref={ruleRef} data-reveal-kind="rule" className="ledger-rule" aria-hidden="true" />
        <table>
          <caption>Source ledger</caption>
          <tbody>{SOURCE_FIGURES.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td className="mono">{numberText(row.value, 0)}</td></tr>)}</tbody>
        </table>
        <figcaption>Offline preprocessing of the full AEP challenge source, recorded in <code>data/processed/graph_summary.json</code>. The interactive demo runs on a 16-premise anonymized sample.</figcaption>
      </figure>
    </div>
  </section>;
}

function Method() {
  const { snapshot } = useIncident();
  const source = snapshot?.impact_source;
  const top = snapshot?.hypotheses[0];
  const restoration = snapshot?.restoration;
  const steps: Array<{ title: string; tag: string; source: string; text: string; live: string }> = [
    {
      title: 'Supplied path', tag: 'AEP challenge data', source: 'aep_challenge',
      text: 'Premise, transformer, fuses, reclosers and circuit breaker, read in order from the supplied upstream sequence. Paths, not live energization.',
      live: source ? `${source.fault_asset_kind === 'CIRCUIT_BREAKER' ? 'Breaker' : 'Transformer'} ${tokenTail(source.fault_asset_token)} · ${source.affected_count_in_sample} of ${source.sample_premise_count} sample premises downstream` : 'Waiting for incident',
    },
    {
      title: 'Modeled sensing', tag: 'Modeled sensor', source: 'modeled_sensor',
      text: `A proposed pole node reports cutout position, temperature, and acoustic and vibration flags, powered by a ${snapshot ? numberText(snapshot.solar.solar_w) : '…'} W panel and ${snapshot ? numberText(snapshot.solar.nominal_wh) : '…'} Wh battery.`,
      live: snapshot ? `Node charge ${numberText(snapshot.solar.battery_soc_pct)}% · ${snapshot.solar.connectivity.toLowerCase()} · modeled` : 'Waiting for incident',
    },
    {
      title: 'Reviewed planning', tag: 'Scenario assumptions', source: 'scenario',
      text: 'Hypotheses ranked by relative evidence, a crew package that is never approved automatically, and person-hours with the 4.5× indirect allowance applied once.',
      live: top ? `${top.label} · ${scoreText(top.score_type, top.score).toLowerCase()}` : 'No hypothesis supplied',
    },
    {
      title: 'Customer guidance', tag: 'Estimated restoration', source: 'estimate',
      text: 'Status in plain language, home battery runtime against the planning range, and preparation steps ordered by urgency.',
      live: restoration && restoration.kind !== 'unavailable' ? `Planning range ${rangeHoursText(restoration.lower_hours, restoration.upper_hours)}` : 'Restoration estimate unavailable for this incident',
    },
  ];
  return <section className="method" aria-labelledby="method-title">
    <div className="page">
      <div className="section-head">
        <Heading id="method-title" lines={['From supplied path', <><Hook />to a plan people</>, 'can act on']} />
        <p className="lead">Four stages, in the order the data moves. Each one carries the label of where its numbers come from, and the live reading beside it belongs to the incident loaded right now.</p>
      </div>
      <Rows className="method-list">
        <ol>{steps.map((step, index) => <li key={step.title} className="method-row">
          <span className="method-index mono">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="display display-m">{step.title}</h3>
          <div className="method-text"><p>{step.text}</p><span className="tag" data-source={step.source}>{step.tag}</span></div>
          <p className="method-live"><span className="method-live-label">Now</span><span>{step.live}</span></p>
        </li>)}</ol>
      </Rows>
    </div>
  </section>;
}

function IncidentRow({ scenario, active, onOpen }: { scenario: ScenarioMeta; active: boolean; onOpen: (scenario: ScenarioMeta, to: '/operator' | '/customer') => void }) {
  const qualifier = scenarioQualifier(scenario.title);
  const cutout = (['OPEN', 'CLOSED', 'UNKNOWN'] as const).find(value => value === scenario.cutout_status) ?? 'UNKNOWN';
  const dependents = scenario.status === 'UNDER_REVIEW' ? 'Not asserted' : `${scenario.expected_affected} ${scenario.expected_affected === 1 ? 'premise' : 'premises'}`;
  return <li className="incident-row" data-active={active}>
    <div className="incident-thumb" aria-hidden="true"><PoleDiagram status={cutout} /></div>
    <div className="incident-main">
      <h3 className="display display-m">{scenarioName(scenario.title)}</h3>
      <p>{scenario.description}</p>
      <div className="incident-tags">{qualifier ? <span className="tag" data-source="scenario">{qualifier}</span> : null}{active ? <span className="state" data-state="closed">Loaded now</span> : null}</div>
    </div>
    <dl className="incident-meta">
      <div><dt>Scenario</dt><dd className="mono">{scenario.id}</dd></div>
      <div><dt>Cutout</dt><dd><span className="state state--plain" data-state={cutout.toLowerCase()}>{CUTOUT_VISUAL[cutout].label}</span></dd></div>
      <div><dt>Incident</dt><dd>{humanize(scenario.status)}</dd></div>
      <div><dt>Modeled dependents</dt><dd>{dependents}</dd></div>
    </dl>
    <div className="incident-actions">
      <button type="button" className="btn btn--small btn--accent" onClick={() => onOpen(scenario, '/operator')}>Open in console<CornerDownRight aria-hidden="true" /></button>
      <button type="button" className="btn btn--small" onClick={() => onOpen(scenario, '/customer')}>Customer view</button>
    </div>
  </li>;
}

function Incidents() {
  const { scenarios, selectedScenarioId, chooseScenario, busy } = useIncident();
  const open = async (scenario: ScenarioMeta, to: '/operator' | '/customer') => {
    const ok = scenario.id === selectedScenarioId || await chooseScenario(scenario.id);
    if (ok) navigate(to);
  };
  return <section className="incidents" aria-labelledby="incidents-title" aria-busy={busy}>
    <div className="page">
      <div className="section-head">
        <Heading id="incidents-title" lines={['Four incidents', <><Hook />one honest method</>]} />
        <p className="lead">Each scenario simulates a fault on equipment from the AEP sample. Load one and the operator console and the customer view change together, because both read the same incident.</p>
      </div>
      {scenarios.length ? <Rows className="incident-list"><ul>{scenarios.map(scenario => <IncidentRow key={scenario.id} scenario={scenario} active={scenario.id === selectedScenarioId} onOpen={open} />)}</ul></Rows>
        : <p className="empty-note">Scenarios load from the Sentinel API. None are available right now.</p>}
    </div>
  </section>;
}

function Receipts() {
  const { snapshot } = useIncident();
  const [source, setSource] = useState<AEPSourceSummary | null>(null);
  const [sourceFailed, setSourceFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetchAEPSource().then(value => { if (live) setSource(value); }).catch(() => { if (live) setSourceFailed(true); });
    return () => { live = false; };
  }, []);
  const counts = useMemo(() => {
    const result = new Map<Provenance, number>();
    snapshot?.evidence.forEach(item => result.set(item.provenance, (result.get(item.provenance) ?? 0) + 1));
    return result;
  }, [snapshot]);
  return <section className="receipts" aria-labelledby="receipts-title">
    <div className="page">
      <div className="section-head">
        <Heading id="receipts-title" lines={['Technology', <><Hook />with receipts</>]} />
        <p className="lead">Every evidence record carries its provenance. The counts in brackets are records of that kind in the incident loaded now.</p>
      </div>
      <p className="receipt-caption" aria-hidden="true">Evidence records in this incident</p>
      <Rows className="receipt-list">
        <ul>{(Object.keys(PROVENANCE) as Provenance[]).map(key => <li key={key} className="receipt-row">
          <h3 className="title">{PROVENANCE[key]}</h3>
          <p>{PROVENANCE_NOTE[key]}</p>
          <span className="receipt-count mono" data-zero={!counts.get(key) || undefined}><span aria-hidden="true">[{counts.get(key) ?? 0}]</span><span className="sr-only">{counts.get(key) ?? 0} evidence records in this incident</span></span>
        </li>)}</ul>
      </Rows>
      <div className="receipts-sample">
        <div>
          <h3 className="title">What the sample covers</h3>
          {source ? <p className="receipts-figure"><span className="mono">{source.premises_in_sample}</span> premises and <span className="mono">{source.equipment_in_sample}</span> equipment nodes, {source.basis}. Live outage data: <strong>{source.is_live_outage_data ? 'yes' : 'no'}</strong>. Territory-wide count: <strong>{source.is_full_territory_impact_count ? 'yes' : 'no'}</strong>.</p>
            : <p className="muted">{sourceFailed ? 'The sample summary could not be loaded.' : 'Loading the sample summary…'}</p>}
        </div>
        <div>
          <h3 className="title">What it cannot claim</h3>
          {source ? <ul className="receipts-limits">{source.limitations.map(item => <li key={item}>{item}</li>)}</ul> : null}
        </div>
      </div>
    </div>
  </section>;
}

function Views() {
  const { snapshot } = useIncident();
  const panelRef = useReveal<HTMLDivElement>();
  const top = snapshot?.hypotheses[0];
  const restoration = snapshot?.restoration;
  const range = restoration && restoration.kind !== 'unavailable' ? rangeHoursText(restoration.lower_hours, restoration.upper_hours) : 'Unavailable';
  return <section className="views" aria-labelledby="views-title">
    <div className="page">
      <div className="section-head">
        <Heading id="views-title" lines={['One incident', <><Hook />two views</>]} />
        <p className="lead">Operators get the evidence, the dependency path and a review-only plan. Customers get the same incident in plain language, with tools for the hours ahead.</p>
      </div>
      <div ref={panelRef} data-reveal-kind="rise" className="views-grid">
        <article className="view-panel view-panel--operator">
          <h3 className="display display-m">Operator console</h3>
          <dl>
            <div><dt>Evidence records</dt><dd className="mono">{snapshot ? snapshot.evidence.length : '…'}</dd></div>
            <div><dt>Leading hypothesis</dt><dd>{top ? top.label : 'None supplied'}</dd></div>
            <div><dt>Planning range</dt><dd className="mono">{range}</dd></div>
            <div><dt>Crew package</dt><dd>{snapshot ? 'Not approved, review required' : '…'}</dd></div>
          </dl>
          <button type="button" className="btn btn--night" onClick={() => navigate('/operator')}>Open operator console<CornerDownRight aria-hidden="true" /></button>
        </article>
        <article className="view-panel view-panel--customer">
          <h3 className="display display-m">Customer view</h3>
          <dl>
            <div><dt>Service status</dt><dd>{snapshot ? humanize(snapshot.status) : '…'} <span className="muted">(simulated)</span></dd></div>
            <div><dt>Risk band</dt><dd>{snapshot ? humanize(snapshot.customer_risk.band) : '…'}</dd></div>
            <div><dt>Alerts on record</dt><dd className="mono">{snapshot ? snapshot.notifications.length : '…'}</dd></div>
            <div><dt>Tools</dt><dd>Battery planner, supply path trace, preparation steps</dd></div>
          </dl>
          <button type="button" className="btn btn--accent" onClick={() => navigate('/customer')}>Open customer view<CornerDownRight aria-hidden="true" /></button>
        </article>
      </div>
    </div>
  </section>;
}

export function LandingPage() {
  const { snapshot } = useIncident();
  const { reduced } = useMotion();
  const listeners = useSmoothScroll(!reduced);
  const progress = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [headerTone, setHeaderTone] = useState<'night' | 'paper'>('night');
  useEffect(() => {
    const onScroll = (scrollY: number) => {
      const height = window.innerHeight;
      const value = Math.min(1.2, Math.max(0, scrollY / height));
      progress.current = value;
      shellRef.current?.style.setProperty('--hero-p', value.toFixed(4));
      setPaused(value > 1.02);
      setHeaderTone(scrollY > height - 72 ? 'paper' : 'night');
    };
    listeners.add(onScroll);
    onScroll(window.scrollY);
    return () => { listeners.delete(onScroll); };
  }, [listeners]);
  return <div className="landing" ref={shellRef}>
    <a href="#overview" className="skip-link">Skip to content</a>
    <SiteHeader route="/" tone={headerTone} floating />
    <main>
      <Hero progress={progress} paused={paused} />
      <div className="landing-sheet">
        <Intro />
        <Method />
        <Incidents />
        <Receipts />
        <Views />
      </div>
    </main>
    <SiteFooter disclosure={snapshot?.disclosure} />
  </div>;
}

export default LandingPage;
