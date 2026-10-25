---
name: LoadShed Sentinel
description: Evidence-first grid platform on a dusk field and a ruled ledger.
colors:
  accent: "#5b34f0"
  accent-strong: "#4420d4"
  accent-soft: "#e7e0ff"
  accent-ink: "#ffffff"
  accent-night: "#b9a5ff"
  accent-night-wash: "rgb(138 92 255 / 0.28)"
  paper: "#f3f1fa"
  paper-2: "#ebe8f6"
  paper-3: "#e1ddf1"
  card: "#ffffff"
  ink: "#15122e"
  ink-2: "#353159"
  muted: "#5f5c7d"
  on-night: "#f4f1ff"
  on-night-muted: "#bdb6e3"
  line: "#dcd8ee"
  line-strong: "#c3bddf"
  night-0: "#0c0a1d"
  night-1: "#17133a"
  night-2: "#262058"
  night-3: "#3b3184"
  night-panel: "#1d1848"
  line-night: "rgb(214 205 255 / 0.18)"
  sky-1: "#1a1542"
  sky-2: "#372d84"
  sky-3: "#6a59c0"
  sky-4: "#8f7ed6"
  sky-5: "#a596e0"
  sky-glow: "rgb(214 201 255 / 0.6)"
  sky-cloud: "rgb(205 192 255 / 0.55)"
  scrim-soft: "rgb(12 10 29 / 0.55)"
  scrim: "rgb(12 10 29 / 0.78)"
  scrim-strong: "rgb(12 10 29 / 0.86)"
  wash-night: "rgb(244 241 255 / 0.04)"
  wash-night-hover: "rgb(244 241 255 / 0.1)"
  edge-night-hover: "rgb(244 241 255 / 0.5)"
  btn-night-fill: "rgb(23 19 58 / 0.55)"
  btn-night-fill-hover: "rgb(59 49 132 / 0.75)"
  state-open: "#9a5a00"
  state-open-fill: "#f0b04a"
  state-open-soft: "#fdf0d9"
  state-closed: "#186b47"
  state-closed-fill: "#59c494"
  state-closed-soft: "#dcf3e8"
  state-unknown: "#545a78"
  state-unknown-fill: "#a9aec8"
  state-unknown-soft: "#e9eaf2"
  state-critical: "#a8261c"
  state-critical-fill: "#e5736a"
  state-critical-soft: "#fbe3e0"
typography:
  display:
    fontFamily: "\"Instrument Serif\", \"Iowan Old Style\", Georgia, serif"
    fontSize: "clamp(2.3rem, 6.2vw, 5.25rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "\"Instrument Serif\", \"Iowan Old Style\", Georgia, serif"
    fontSize: "clamp(2.4rem, 5.4vw, 5rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.012em"
  title:
    fontFamily: "\"Hanken Grotesk Variable\", \"Hanken Grotesk\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.6vw, 1.625rem)"
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "\"Hanken Grotesk Variable\", \"Hanken Grotesk\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"ss01\", \"cv11\""
  label:
    fontFamily: "\"Hanken Grotesk Variable\", \"Hanken Grotesk\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 560
  mono:
    fontFamily: "\"Geist Mono Variable\", \"Geist Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"
    fontSize: "0.92em"
    fontWeight: 400
    letterSpacing: "-0.01em"
rounded:
  xs: "4px"
  s: "8px"
  m: "12px"
  l: "16px"
  xl: "20px"
  pill: "9999px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "3rem"
  space-8: "4rem"
  space-9: "6rem"
  gutter: "clamp(1rem, 3.2vw, 2.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.accent-ink}"
  button-paper:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem"
    height: "48px"
  button-paper-hover:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
  button-night:
    backgroundColor: "{colors.btn-night-fill}"
    textColor: "{colors.on-night}"
    rounded: "{rounded.pill}"
    padding: "0 1.4rem"
    height: "48px"
  button-night-hover:
    backgroundColor: "{colors.btn-night-fill-hover}"
    textColor: "{colors.on-night}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 0.85rem"
    height: "40px"
  button-quiet-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-night}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "10px"
    padding: "0.55rem 0.85rem"
    height: "44px"
    typography: "{typography.body}"
  nav-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    height: "44px"
  nav-link-current:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 0.55rem"
    height: "24px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.9rem"
    height: "36px"
  chip-state:
    backgroundColor: "{colors.state-unknown-soft}"
    textColor: "{colors.state-unknown}"
    rounded: "{rounded.pill}"
    padding: "0 0.7rem"
    height: "28px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  card-night:
    backgroundColor: "{colors.night-panel}"
    textColor: "{colors.on-night}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
---

# Design System: LoadShed Sentinel

## Overview

**Creative North Star: "The Dusk Ledger"**

LoadShed Sentinel opens on a dusk-violet sky with the Sentinel pole at the center, then settles onto pale periwinkle paper and tells the incident as a ruled ledger. Display is Instrument Serif, uppercase, with an italic lead word. Reading is Hanken Grotesk. Tokens, times, and measurements are Geist Mono. The operator console is the dense surface. The customer view keeps the same faces, the same rules, and the same state colors, with more air.

Ultraviolet is the single accent, reserved for actions and selection. Figures, counts, and record ids stay in night ink. Amber, green, and slate are cutout and incident state. Brick is outage, fault, and critical state. Night panels return for the pole, the inspector, and the footer. The confirmed rejection is a dark neon map dashboard tiled with KPI cards.

**Key Characteristics:**

- Dusk-violet sky that settles into pale periwinkle paper
- One ultraviolet accent for actions and selection
- Instrument Serif uppercase display, an italic lead word, and a hook arrow between phrases
- Hanken Grotesk for reading; Geist Mono for tokens, times, and measurements
- Pill buttons with a gradient stroke, and hairline-ruled rows
- Amber, green, and slate for cutout and incident state; brick for outage, fault, and critical state
- Figures, counts, and record ids stay in ink

## Colors

Periwinkle paper, a violet night sky, one ultraviolet for action, and four state triads for status.

### Primary

- **Ultraviolet** (#5b34f0): Actions and selection. Primary buttons, pressed paper chips, selected rows, text links, and the focus ring.
- **Ultraviolet Deep** (#4420d4): Hover fill on the primary button, and the text of a text link.
- **Ultraviolet Wash** (#e7e0ff): Soft fill behind a hovered evidence chip, a checked household need, and a supporting record.
- **Accent Ink** (#ffffff): Text and icons on an ultraviolet fill.
- **Night Ultraviolet** (#b9a5ff): The accent on a night surface. Focus rings in the footer and in night panels, and the wordmark's second word while the header floats on the dusk field.
- **Night Ultraviolet Wash** (rgb(138 92 255 / 0.28)): The translucent band on a night-toned range chart.

The hook arrow and the wordmark's second word use this accent. So do the range track, the battery meter, the leading hypothesis bar, a hovered method title, timeline dots, and the traced supply connector. The numeric reading on those meters stays ink. Figures, counts, and record ids stay in ink.

### Neutral

- **Periwinkle Paper** (#f3f1fa): Page background once the hero is covered.
- **Paper Raised** (#ebe8f6): Hover fill for paper and quiet buttons, the incident bar, and nested hypothesis detail.
- **Paper Sunken** (#e1ddf1): Disabled button fill, empty meter tracks, and empty score tracks.
- **Card White** (#ffffff): Cards, fields, and the paper button fill.
- **Night Ink** (#15122e): Body text, figures, counts, and record ids, and the 2px rule that opens a ledger.
- **Ink Secondary** (#353159): Lead copy and quiet-button text.
- **Muted Ink** (#5f5c7d): Labels above figures, placeholders, captions, and a count that is zero.
- **Night Paper** (#f4f1ff): Text on night surfaces.
- **Night Muted** (#bdb6e3): Secondary text on night surfaces.
- **Hairline** (#dcd8ee): Row rules on paper and dividers inside cards.
- **Strong Hairline** (#c3bddf): Field borders, tag borders, and the stronger row rules.
- **Night** (#0c0a1d): The top of the sky, the landing ground, and the footer.
- **Night Raised** (#17133a): Solid night button fill in the footer, the dark end of a night panel, and the text of a pressed night chip.
- **Night Lift** (#262058): The lighter end of the operator view panel, and the footer button hover.
- **Night Bright** (#3b3184): The lower stop of an incident thumbnail.
- **Night Panel** (#1d1848): The lower stop of the inspector panel.
- **Night Hairline** (rgb(214 205 255 / 0.18)): Rules and chip borders on night.
- **Sky Deep** (#1a1542), **Sky Mid** (#372d84), **Sky Dusk** (#6a59c0), **Sky Lilac** (#8f7ed6), **Sky High** (#a596e0): The vertical dusk ramp on the hero and inside the inspector, from the top of the field toward the horizon.
- **Sky Glow** (rgb(214 201 255 / 0.6)): Horizon glow under the pole.
- **Sky Cloud** (rgb(205 192 255 / 0.55)): The blurred clouds on the hero.
- **Soft Scrim** (rgb(12 10 29 / 0.55)): Hero chips, the lower hero shade, and the sheet's lift.
- **Scrim** (rgb(12 10 29 / 0.78)): Hotspot labels and the inspector's fallback note.
- **Strong Scrim** (rgb(12 10 29 / 0.86)): The deepest stop of the hero shade.
- **Night Wash** (rgb(244 241 255 / 0.04)): Resting fill of a night chip and icon button.
- **Night Wash Hover** (rgb(244 241 255 / 0.1)): Hover fill of those night controls.
- **Night Edge** (rgb(244 241 255 / 0.5)): Hover border of those night controls.
- **Night Button Fill** (rgb(23 19 58 / 0.55)): Translucent fill of the night pill.
- **Night Button Hover** (rgb(59 49 132 / 0.75)): Hover fill of the night pill.

### State

- **Cutout Amber** (#9a5a00), **Amber Fill** (#f0b04a), **Amber Soft** (#fdf0d9): Open and at-risk. The ink is the word, the fill is the dot, the soft is the pill.
- **Cutout Green** (#186b47), **Green Fill** (#59c494), **Green Soft** (#dcf3e8): Closed, restored, and normal. The same three jobs.
- **Slate** (#545a78), **Slate Fill** (#a9aec8), **Slate Soft** (#e9eaf2): Unknown. The default state mark when no status is asserted.
- **Brick** (#a8261c), **Brick Fill** (#e5736a), **Brick Soft** (#fbe3e0): Outage, fault, and critical, including a simulated fault on the supply path and an immediate customer warning.

A status word in the console takes its state ink. Open reads amber, closed and normal read green, unknown reads slate, and critical reads brick. The number beside that word stays Night Ink.

### Named Rules

**The Action Accent Rule.** Ultraviolet is for actions and selection only. Figures, counts, and record ids stay in ink.

**The State Palette Rule.** Amber, green, and slate are cutout and incident state. Brick red is outage, fault, and critical state. Green is not a runtime or success-chart color.

## Typography

**Display Font:** Instrument Serif (with Iowan Old Style, Georgia, serif)
**Body Font:** Hanken Grotesk Variable (with Hanken Grotesk, ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** Geist Mono Variable (with Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace)

**Character:** A high-contrast serif for the few lines that announce a section, a humanist grotesque for everything a person has to read, and a mono only where a token, a time, or a measurement has to be compared.

### Hierarchy

- **Display** (400, clamp(2.3rem, 6.2vw, 5.25rem), line-height 0.92, tracking -0.012em): The hero. Uppercase Instrument Serif. The lead word is italic, in sentence case, at tracking -0.02em.
- **Headline** (400, clamp(2.4rem, 5.4vw, 5rem), line-height 0.92, tracking -0.012em): Landing section heads, same face and posture. Row titles, customer section heads, outlook hours, and the battery planner's headline use the same face at clamp(2rem, 3.6vw, 3.25rem). Console section heads use it at clamp(1.5rem, 2.2vw, 2.125rem), line-height 0.95, tracking -0.01em.
- **Title** (560, clamp(1.375rem, 1.6vw, 1.625rem), line-height 1.2, tracking -0.015em): Hanken Grotesk for a panel title in the reading face. The wordmark is Instrument Serif at this size, sentence case, with the second word italic.
- **Body** (400, 1rem, line-height 1.55): Hanken Grotesk, with ss01 and cv11. Lead copy is clamp(1.0625rem, 1.25vw, 1.25rem), line-height 1.5, Ink Secondary, and wraps near 60ch. Buttons use this size at weight 560.
- **Label** (560, 0.8125rem): Navigation, state marks, and compact meta. Labels above a figure are 0.75rem at weight 600 in Muted Ink. The smallest mono note is 0.6875rem.
- **Mono** (400, 0.92em, tracking -0.01em): Geist Mono with tabular numerals. Record ids, asset tokens, timestamps, ledger counts, hypothesis scores, and numeric inputs.

Console instrument readings and planning figures are Hanken Grotesk at the heading size, weight 500, with tabular numerals, in Night Ink unless the reading is a state word. Customer outlook hours and the planner's headline figure are Instrument Serif. Ids, timestamps, ledger counts, and numeric inputs are Geist Mono.

### Named Rules

**The Three Faces Rule.** Instrument Serif for display, Hanken Grotesk for reading, Geist Mono for tokens, times, and measurements.

**The Italic Lead Rule.** Display is uppercase roman at weight 400. The lead word is italic and keeps sentence case.

## Layout

The page column is 92rem, with a gutter of clamp(1rem, 3.2vw, 2.5rem). The header is 4.5rem and sticks. The hero is a sticky 100svh dusk field, at least 34rem tall. The sheet that follows covers it. Landing sections pad clamp(4.5rem, 10vw, 8.5rem) and separate with a hairline.

The opening statement uses a 12-column grid: the display spans ten columns, the reading copy starts on the second column and runs five, and the source ledger occupies the last five. Below 899px that grid, the section head, and the hero copy become one column.

The console head is two columns. The inspect area is seven and five. Planning is 1.2 and 1. Locations are 1.35 and 1. The customer hero is 1.55 and 1, and customer sections are four and eight with a sticky section head. The spacing steps in use are 0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem, 4rem, and 6rem. Console and customer sections open on the 6rem step.

Below 1180px the console inspect stack becomes one column. Below 1080px method and incident rows drop their side columns. Below 960px the console head, planning, the customer hero, and customer sections stack. Below 860px the header nav collapses to a paper sheet, and the view panels and footer stack. Below 640px incident rows, the evidence ledger, and the outlook become one column.

Landing display lines reveal over 900ms. Console and customer swaps run at 240ms. Field, chip, and quiet-button color changes run at 160ms. The out curve is cubic-bezier(0.16, 1, 0.3, 1). Under reduced motion those durations are 0ms and the content is on screen.

### Named Rules

**The Ruled Sheet Rule.** After the hero, content sits on periwinkle paper inside a 92rem column. Sections and ledger rows divide with a 1px rule.

## Elevation & Depth

The working surface is flat. Depth is a change of tone, from periwinkle paper to card white, or from paper to a night panel, plus a hairline. Paper cards carry one soft shadow. The landing sheet lifts off the hero with a soft upward shadow. Night panels are a vertical gradient and carry the night hairline. Hero type sits on a soft scrim shadow so the serif stays readable on the sky.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 2px rgb(21 18 46 / 0.05), 0 8px 24px -12px rgb(21 18 46 / 0.12)`): Paper cards on the sheet. The customer premise card and the customer view panel.
- **Thumb** (`box-shadow: 0 1px 3px rgb(21 18 46 / 0.3)`): The range thumb.
- **Sheet** (`box-shadow: 0 -24px 48px -24px rgb(12 10 29 / 0.55)`): The landing sheet over the dusk hero.
- **Hero type** (`text-shadow: 0 2px 14px rgb(12 10 29 / 0.55)`): The hero display. The descriptor uses a shorter scrim, `0 1px 10px`.
- **Label** (`box-shadow: 0 6px 18px -8px rgb(12 10 29 / 0.86)`): Hotspot labels floating on the pole, over a scrim fill.

### Named Rules

**The Soft Card Rule.** A paper card on the sheet uses the soft card shadow. A night panel is a change of tone.

## Shapes

Controls that a person presses or reads as a status are pills. Surfaces that hold a record are gently rounded. The landing sheet is the one silhouette with a larger top corner, 28px, and a square bottom where it meets the footer.

The radius steps in use are 4px, 8px, 12px, 16px, 20px, and the pill at 9999px. Cards, night panels, and the supply sheet use 20px. Frames inside the inspector and incident thumbnails use 16px. Nested notes and household needs use 12px. The range's expected-value tag uses 4px. Fields use 10px, between the 8px and 12px steps.

Rules are 1px. A block that opens a subject uses Night Ink. A row inside it uses the hairline or the strong hairline. Empty and unknown containers use a dashed strong hairline. A modeled tag is dashed. A scenario tag is dotted at 1.5px. A field-confirmed tag uses the green state ink for its border and its text.

### Named Rules

**The Pill Control Rule.** Buttons, tags, state marks, and night chips are pills. Cards and panels use the 20px radius. Fields use 10px.

## Components

### Buttons

Filled buttons are pills, 48px tall, padded 0 1.4rem, set in Hanken Grotesk at body size and weight 560. A 1px gradient stroke sits on the border box: violet, periwinkle paper, and violet again on paper, and a lighter violet stroke on night. Hover swaps the fill over 240ms on the out curve. Active shifts the button 1px down. The corner arrow shifts 2px right and 1px up on hover. Focus is a 2px ultraviolet outline, 3px outside the pill, with a 6px corner on the outline. On a night surface the outline is Night Ultraviolet.

- **Primary:** Ultraviolet fill, Accent Ink text. Hover is Ultraviolet Deep.
- **Paper:** Card White fill, Night Ink text. Hover is Paper Raised. The footer paper button uses Night Raised and Night Paper, and hovers to Night Lift, with the night stroke.
- **Night:** Night Button Fill, Night Paper text, the night stroke. Hover is Night Button Hover.
- **Quiet:** Transparent, a 1px strong hairline, Ink Secondary, 40px tall, padded 0 0.85rem, small size at weight 540. Hover is Paper Raised, an Ink Secondary border, and Night Ink text. Pressed is Night Ink fill and Night Paper text.
- **Small:** 40px tall, padded 0 1rem, at the small size (0.875rem).
- **Disabled:** Paper Sunken fill, Muted Ink text, a solid fill, and no shift.
- **Text link:** Ultraviolet Deep, weight 560, underline at 35% ultraviolet, full underline on hover.

### Chips

State marks are pills, 28px tall, padded 0 0.7rem, label size at weight 600. The soft color is the pill, the state ink is the word, and an 8px dot in the fill color carries a 2px halo at 30% of that fill. Open and at-risk use the amber triad. Closed, restored, and normal use the green triad. Unknown uses slate, and unknown is the resting mark. Outage and critical use the brick triad. The plain variant drops the soft fill and the padding, and keeps the dot and the word.

Provenance tags are pills, 24px tall, padded 0 0.55rem, 0.75rem at weight 560, with a 1px strong hairline and Ink Secondary text. An AEP-challenge tag tints its border to 45% ultraviolet and its text to Ultraviolet Deep. A modeled tag is dashed. A scenario tag is dotted at 1.5px. A field-confirmed tag uses Cutout Green for the border and the text.

A paper selection chip is 36px tall, padded 0 0.9rem. Pressed, it is ultraviolet with Accent Ink. A night chip rests on Night Wash with a night hairline, and pressed it is Night Paper with Night Raised text.

### Cards / Containers

Paper cards are Card White, 20px corners, a 1px hairline, 1.5rem of padding, and the card shadow. The customer premise card is this shape. The customer view panel uses the same white, the same 20px corner, and the same shadow, with padding clamp(1.5rem, 3.5vw, 3rem) and the hairline drawn between its rows.

Night panels are 20px, a vertical gradient from Night Raised to Night Panel, Night Paper text, and the night focus outline. The inspector scene inside them repeats the dusk ramp and uses a 16px frame.

Empty and unavailable containers are a dashed strong hairline, 16px or 12px corners, and Muted Ink or Ink Secondary text.

### Inputs / Fields

Fields are 44px tall, 10px corners, a 1px strong hairline, Card White, Night Ink, padded 0.55rem 0.85rem. The placeholder is Muted Ink. Hover moves the border to Muted Ink. Focus removes the outer outline, turns the border ultraviolet, and draws a 3px ring at 22% ultraviolet. The label above a field is small size at weight 560 in Ink Secondary. The hint under it is 0.75rem in Muted Ink.

Selects share the field and add a muted chevron. Numeric and token fields use Geist Mono. The range is a 4px track, ultraviolet on the filled side and Paper Sunken on the rest, with a 22px circular thumb, a 2px Card White edge, and the thumb shadow.

### Navigation

The header is 4.5rem. On the hero it floats with a transparent ground; over the sheet it picks up periwinkle paper and a hairline. The wordmark is Instrument Serif at the title size: "loadshed" in the current ink, "sentinel" italic in ultraviolet, switching to Night Ultraviolet while the header is on the dusk field.

Links are uppercase Hanken Grotesk, label size, weight 560, Ink Secondary, with a 44px target. Hover and the current page shift the word to Night Ink and draw a 1px underline from the left over 240ms. Below 860px the center nav becomes a paper sheet of display-size links, and the current page is ultraviolet. Focus uses the ultraviolet outline, or Night Ultraviolet on the footer.

The incident bar under the header is Paper Raised, with the same fields and a state mark for the loaded incident.

### Hook arrow

The hook is the corner arrow that joins two halves of a display line. It is 0.62em, ultraviolet, and Night Ultraviolet in the footer. On a button the same arrow is 1.05em and shifts up-right on hover.

## Do's and Don'ts

### Do:

- **Do** use ultraviolet (#5b34f0) for actions and selection only, and keep figures, counts, and record ids in ink (#15122e).
- **Do** use amber (#9a5a00), green (#186b47), and slate (#545a78) for cutout and incident state, and brick (#a8261c) for outage, fault, and critical state.
- **Do** set display in Instrument Serif at weight 400, uppercase, with the lead word in italic, and join display phrases with the hook arrow.
- **Do** set reading text in Hanken Grotesk and set tokens, times, and measurements in Geist Mono.
- **Do** draw filled buttons as pills with the gradient stroke, at least 48px tall, and divide ledger rows with a 1px rule.

### Don't:

- **Don't** color a figure, a count, or a record id in ultraviolet. A state word uses its state ink; the number beside it stays in ink.
- **Don't** use green as a runtime or success-chart color.
- **Don't** present the working view as a dark neon map dashboard tiled with KPI cards.
- **Don't** give the ledger a second accent. Amber, green, slate, and brick are state.
