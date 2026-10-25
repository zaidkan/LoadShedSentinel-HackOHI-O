import { useState } from 'react';
import type { CutoutStatus } from '../../../contracts/types';
import { SentinelHero } from '../three/SentinelHero';
import { AssetViewport } from '../three/AssetViewport';
import { FOCUS_ORDER, SENTINEL_PARTS, type SentinelFocus } from '../three/sentinel/catalog';
import { CUTOUT_VISUAL } from '../three/visual-state';
import '../components/utility/utility.css';
import './sentinel-preview.css';

const OVERVIEW_COPY = 'An illustrative, procedurally modeled distribution pole that presents the proposed Sentinel node in its working context: transformer, protective cutout, solar module and primary framing.';
const PREVIEW_STATES: CutoutStatus[] = ['CLOSED', 'OPEN', 'UNKNOWN'];

/**
 * Development preview for the Sentinel 3D system (`/#/sentinel`). It demonstrates the hero
 * presentation and the inspection view without a backend; it is not a production page.
 */
export function SentinelPreviewPage() {
  const [focus, setFocus] = useState<SentinelFocus>('overview');
  const [previewStatus, setPreviewStatus] = useState<CutoutStatus>('CLOSED');
  const part = focus === 'overview' ? null : SENTINEL_PARTS[focus];
  return <div className="sp-page">
    <section className="sp-hero" aria-labelledby="sp-hero-title">
      <SentinelHero focus={focus} onFocusChange={setFocus} className="sp-hero-stage" />
      <header className="sp-topbar">
        <span className="sp-brand">LoadShed <strong>Sentinel</strong></span>
        <span className="sp-badge">Model preview · hero mode</span>
        <a className="sp-back" href="#">Back to console</a>
      </header>
      <div className="sp-copy">
        <p className="sp-eyebrow">Grid-edge sensing concept</p>
        <h1 id="sp-hero-title"><span>A quiet sentinel</span> <span>for the distribution pole.</span></h1>
        <div className="sp-detail" aria-live="polite" key={focus}>
          <h2>{part ? <><small>{part.index}</small>{part.label}</> : <><small>00</small>Assembly overview</>}</h2>
          <p>{part ? part.summary : OVERVIEW_COPY}</p>
        </div>
        <nav className="sp-chapters" aria-label="Frame a component">
          {FOCUS_ORDER.map((item, i) => <button key={item} type="button" aria-pressed={focus === item} onClick={() => setFocus(item)}>
            <span>{String(i).padStart(2, '0')}</span>{item === 'overview' ? 'Overview' : SENTINEL_PARTS[item].label}
          </button>)}
        </nav>
      </div>
      <footer className="sp-footnote">
        <span>Drag to orbit · select a marker or chapter to frame it · the view recomposes when idle</span>
        <span>Illustrative procedural model · concept hardware, not installed equipment</span>
      </footer>
    </section>

    <section className="sp-inspection" aria-labelledby="sp-inspection-title">
      <div className="sp-inspection-intro">
        <p className="sp-eyebrow">Same model · inspection mode</p>
        <h2 id="sp-inspection-title">Technical inspection view</h2>
        <p>The utility console renders this mode from the incident snapshot. Here a preview control steps through every cutout state a snapshot can report; it is not incident data, and node telemetry is shown as not supplied.</p>
        <div className="sp-state-control" role="group" aria-label="Preview cutout state">
          {PREVIEW_STATES.map(state => <button key={state} type="button" aria-pressed={previewStatus === state} onClick={() => setPreviewStatus(state)}>
            <span className="sp-state-dot" style={{ background: CUTOUT_VISUAL[state].color }} />{CUTOUT_VISUAL[state].label}
          </button>)}
        </div>
      </div>
      <div className="utility-console sp-console">
        <AssetViewport status={previewStatus} assetId="PREVIEW-ASSET" />
      </div>
    </section>
  </div>;
}

export default SentinelPreviewPage;
