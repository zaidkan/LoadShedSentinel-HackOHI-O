# LoadShed Sentinel — Competitive Differentiation & WOW Recommendation

**Decision Document:** Top-3 Finalists, Single Recommended Winner & Implementation Specification  
**Event:** HackOHI/O 2026 (AEP Track)  
**Submission Deadline:** Sunday, October 25, 2026, 10:00 AM EDT (Google Form via Discord)  
**Auditor:** Competitive Intelligence & Differentiation Specialist  
**Gate Condition:** **OWNER APPROVAL REQUIRED BEFORE IMPLEMENTATION.** (Per Section 5.5 and Section 8.2 of the handoff directive).

---

## 1. Top-3 Finalists Comparison & Ranking

Following the adversarial scoring of 18 candidate features in `research/FEATURE_CANDIDATES.md`, three finalists emerged with scores > 80/100 and zero veto flags:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TOP-3 FINALIST COMPARISON                                     │
├──────┬───────────────────────┬───────┬──────────────┬─────────────┬─────────────────────────────┤
│ Rank │ Candidate Feature     │ Score │ Demo Time    │ Eng. Effort │ Decisive Advantage          │
├──────┼───────────────────────┼───────┼──────────────┼─────────────┼─────────────────────────────┤
│  #1  │ C-02: Counterfactual  │ 87.0  │ 12–15 seconds│ ~2 hours    │ Solves AEP's #1 storm       │
│      │ Incident Comparator   │       │              │ (low risk)  │ misdispatch problem         │
├──────┼───────────────────────┼───────┼──────────────┼─────────────┼─────────────────────────────┤
│  #2  │ C-05: Sourced Labor   │ 84.5  │ 10–12 seconds│ ~1.5 hours  │ Mathematical transparency   │
│      │ Breakdown Modal       │       │              │ (low risk)  │ from verified C21/D21 cells │
├──────┼───────────────────────┼───────┼──────────────┼─────────────┼─────────────────────────────┤
│  #3  │ C-01: Blast-Radius    │ 82.0  │ 15–20 seconds│ ~3 hours    │ High visual dynamism        │
│      │ Topology Explorer     │       │              │ (med risk)  │ on SVG feeder canvas        │
└──────┴───────────────────────┴───────┴──────────────┴─────────────┴─────────────────────────────┘
```

### Why Candidate C-02 Beats C-05 and C-01:
- **C-05 (Labor Modal)** is mathematically rock-solid and already proven by our test suite, but a modal popup is visually static. It appeals to a technical auditor reading code, but lacks the dramatic visual cause-and-effect needed in a fast-paced 3-minute video.
- **C-01 (Blast-Radius Explorer)** is visually engaging, but riskier to implement: modifying SVG click handling and dynamic path tracing across nodes risks regression in `FeederMap.tsx` geometry (which just had hit-target clamping resolved in F13).
- **C-02 (Counterfactual Comparator)** delivers the single most persuasive story in utility engineering: **preventing the expensive misdispatch of a crane crew**. It reuses existing robust backend scenario endpoints (`/api/scenario/select`) and leverages our 3D cutout switch animation (`OPEN` vs `CLOSED`) to create an unforgettable 15-second comparison.

---

## 2. Single Recommended Winner: Feature C-02 (Counterfactual Incident Comparator)

### 2.1 The Core Operational Narrative
In major storm events, utilities are flooded with thousands of residential outage tickets. When three homes on Elm Street report an outage, legacy OMS systems often assume the local distribution transformer has blown, dispatching a 3-person heavy bucket/crane replacement crew ($10,000–$15,000 callout cost). 

When the crew arrives 3 hours later, they find the transformer is completely energized and undamaged—the outage was actually caused by an upstream substation feeder breaker lockout 5 miles away. The crew wasted half a shift, while homes that actually needed a transformer replacement waited in the dark.

**Feature C-02 provides a dedicated "Counterfactual Analysis" toggle** that allows the operator or judge to instantly compare:
1. **Hypothesis A (Local Protective Cutout Blown):** Cutout switch `OPEN`, 3 premises out, transformer core intact, requires a 2-person line crew and a replacement fuse link.
2. **Hypothesis B (Upstream Feeder Trip):** Cutout switch `CLOSED` (latched), 16 premises out (entire branch), transformer healthy, requires upstream substation patrol; **explicitly prevents local transformer replacement misdispatch.**

---

## 3. The 15-Second Demonstration "WOW" Beat

This sequence is designed to fit seamlessly into Speaker 3's window (01:25–02:15) or Speaker 2's window (00:40–01:25) of the official demo video:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                THE 15-SECOND "WOW" SEQUENCE                                    │
├────────────┬───────────────────────────────────────────────────────────────────────────────────┤
│ 00:00–00:04│ BEFORE: Utility Console displays Scenario 1 (Local Protection).                   │
│            │ 3D Cutout switch is blown OPEN (-117.5° drop). 3 dependent premises in sample.   │
│            │ Dispatch card: "Line Crew (2 workers), replacement fuse link required."           │
├────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ 00:04–00:07│ ACTION: Presenter clicks "Compare Upstream Counterfactual" toggle.                │
├────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ 00:07–00:12│ AFTER: 3D Twin instantly latches cutout switch to CLOSED (0°).                    │
│            │ Feeder Map highlights entire 16-premise branch.                                   │
│            │ Work package shifts to "Upstream Substation Feeder Crew."                         │
│            │ Red alert banner: "LOCAL TRANSFORMER REPLACEMENT AVOIDED (Saved 8.97 Person-Hrs)"  │
├────────────┼───────────────────────────────────────────────────────────────────────────────────┤
│ 00:12–00:15│ WHY IT MATTERS (Spoken Voiceover):                                                │
│            │ "By checking physical cutout drop before rolling a truck, Sentinel avoids a       │
│            │ $12,000 transformer misdispatch, keeping crews focused on real field damage."     │
└────────────┴───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Minimal Executable Implementation Plan (If Approved)

### 4.1 Required Source Data & Feasibility
- **Zero new data required.** Uses existing `local_protection` (`INC-2026-0881`) and `upstream_feeder` (`INC-2026-0894`) snapshots already present in `engine/scenarios.py` and `data/processed/network_bundle.json`.
- Both scenarios share the same primary anchor transformer (`ASSET-3D728064C2BE9061`) and upstream circuit breaker.

### 4.2 Code Changes Scope
1. **Frontend UI (`web/src/components/utility/CounterfactualCompareCard.tsx`):**
   - A compact, high-contrast comparative card in the Utility Console.
   - Shows a 2-column delta:
     - Cutout State: `OPEN (Blown Drop)` vs `CLOSED (Latched)`
     - Impact Scope: `3 Premises` vs `16 Premises`
     - Actionable Dispatch: `Local Fuse Replacement` vs `Substation Breaker Patrol`
     - Misdispatch Prevention: `Avoids False 8.97h Transformer Replacement`
2. **API Interaction:**
   - Pure client-side toggle or fast `POST /api/scenario/select` switching between the two existing scenarios.
   - Preserves backend atomic validation and causes zero schema mutations.

### 4.3 Acceptance Criteria & Verification Tests
1. **Test AC-1:** Clicking "Compare Counterfactual" preserves the selected asset token (`ASSET-3D728064C2BE9061`).
2. **Test AC-2:** Cutout visual state cleanly transitions between `-2.05 rad` and `0.0 rad` without Three.js errors.
3. **Test AC-3:** Customer Concierge view displays matching status (`OUTAGE`) and does not emit duplicate notification alerts.
4. **Test AC-4:** All 117 backend tests and `npm run build` must continue to pass with 0 errors.

### 4.4 Rollback Plan
- Work will be developed in a feature branch: `feature/counterfactual-comparator`.
- If any TypeScript error or regression occurs, the branch is discarded with `git checkout main`, leaving `e5f5abb` 100% intact.

---

## 5. Alternative Recommendation: Zero-Code Demonstration Polish

If the project owner or engineering team decides that implementing *any* new feature within hours of the deadline introduces unacceptable risk to release stability:

**Secondary Recommendation:** **Do NOT add new code. Polish the demonstration script and video execution around the existing 4 scenarios.**
- The existing codebase at commit `e5f5abb` already contains the technical foundation for this exact comparison between Scenario 1 and Scenario 2.
- The presenter can simply select Scenario 1, show the blown cutout and 3 affected homes, then select Scenario 2 and show the closed cutout, 16 affected homes, and the avoided local replacement work package.
- This achieves 90% of the judging impact with **zero code change, zero regression risk, and zero release delay**.

---

## 6. Required Owner Decision

The owner must explicitly choose between:
- **Option A (Implement Feature C-02):** Implement the dedicated Counterfactual Comparison UI card in a clean branch with full regression tests. (~2 hours).
- **Option B (Zero-Code Demo Polish):** Freeze code at `e5f5abb`, record the four-speaker video highlighting the existing Scenario 1 vs Scenario 2 contrast, and proceed directly to submission verification.
