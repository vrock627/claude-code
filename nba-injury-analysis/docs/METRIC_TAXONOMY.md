# Metric Taxonomy

Precise definitions for each metric. The enum values here are authoritative and
must match `src/nba_injury/schema/enums.py`. Both injury labels
(`ClipMetricLabel`) and base-rate plays (`PlayRecord`) use these identical
fields so the two are directly comparable in Phase C.

The **event** is the moment of injury (for injury clips) or the moment of the
comparable action (for base-rate plays) — typically the landing.

## takeoff_feet — `FootCount`
How many feet the player pushed off from immediately before becoming airborne.
- `zero` — no jump (e.g. a planted pivot, a standing injury).
- `one` — single-foot takeoff (layup-style).
- `two` — two-foot takeoff (jump-stop, rebound gather).
- `unknown` — cannot be determined.

## landing_feet — `FootCount`
How many feet made **first** ground contact when returning to the floor.
- `one` — single-foot landing (highest-load case of interest).
- `two` — both feet land together (within ~1 frame).
- `zero` — did not land on feet (then set `landing_surface`).
- `unknown`.

Decision rule: if the first ground contact after the airborne phase is a single
foot, label `one`, even if the second foot lands shortly after.

## landing_surface — `LandingSurface`
The first body part to make significant ground contact.
- `feet` — normal landing.
- `knee`, `hip_back`, `hand_arm`, `other` — fell / landed on a non-foot part.
- `unknown`.

## motion_state — `MotionState`
Whether the player's body was translating horizontally at the event.
- `moving` — running, driving, cutting.
- `stationary` — set, jumping straight up, standing.
- `unknown`.

## interference — `InterferenceType`
Contact from another player that plausibly contributed to the event.
- `none` — non-contact.
- `stepped_on_foot` — landed on / stepped on another player's foot.
- `shoved_contact` — pushed/bumped off balance.
- `collision` — significant body-to-body collision.
- `other`, `unknown`.

Record the other player in `interference_player` when known.

## Supporting fields
- `event_frame` — frame index of the event moment (landing/injury).
- `confidence` — labeler's confidence in the label (0–1).
- `label_source` — `manual` (ground truth), `cv_assisted` (human confirmed a CV
  suggestion), or `cv_auto` (model only, not reviewed).

## Injury descriptors (`InjuryEvent`)
- `injury_body_part` (`BodyPart`), `injury_side` (`InjurySide`),
  `mechanism_contact` (contact vs non-contact).
