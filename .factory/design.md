# Photo Metadata Inbox — visual thesis

## Direction: the night train to a cleared archive

The interface borrows the visual grammar of a 1930s art-deco transit poster: a
finite route, numbered stops, brass wayfinding, ink-dark night, and warm paper.
That is functional, not nostalgic decoration. A metadata backlog is easier to
finish when it feels like a bounded journey with a visible terminus. Every
asset is a stop; events are platforms; “done” advances the route.

The product is deliberately single-mode. The midnight/navy workspace protects
photographers' night vision and lets cream editing surfaces read like physical
catalog cards. There is no generic gradient hero and no borrowed component
library aesthetic.

## Tokens

- `--ink: #101925` — page background, derived from darkroom blackout cloth.
- `--ink-raised: #172434` — raised navigation and panels.
- `--paper: #f5edda` — primary work surface, like an archival envelope.
- `--paper-deep: #e4d5b8` — rules and secondary paper surfaces.
- `--text-on-dark: #fff8e8`; `--muted-on-dark: #bac6ce`.
- `--text-on-paper: #18212a`; `--muted-on-paper: #58616a`.
- `--brass: #e5b85c`; `--brass-strong: #f2c86d` — the active route/accent.
- `--coral: #e96d58` — warnings and the incomplete stop marker.
- `--green: #75b995` — completed stops and safe confirmation.
- `--danger: #bd3c3c` — destructive/error only.

All body/color pairs exceed 4.5:1. Status always has a word or symbol as well
as color.

## Type and spacing

- Display: `Georgia, "Times New Roman", serif`, in uppercase with restrained
  tracking. Its carved terminals evoke poster lettering without a font
  download.
- Utility/body: `Avenir Next, Futura, "Trebuchet MS", system-ui, sans-serif`.
  The geometry supports route numbers and compact controls. No runtime font
  requests.
- Scale: 14 / 16 / 20 / 26 / clamp(32–54) px. Body is never below 16 px.
- Spacing follows an 8 px base: 4, 8, 12, 16, 24, 32, 48, 64. Controls are at
  least 44 px and separated by at least 8 px.

## Layout and interaction grammar

Desktop is a three-part station board: slim route rail, central catalog card,
and a progress/vocabulary inspector. Mobile drops the persistent inspector and
makes the event queue a horizontal “platform strip”; editing remains one
column. The current asset is always visually dominant. Straight rules,
stepped corners, ticket notches, and repeating fan/sunburst geometry carry the
deco language.

The primary keyboard path is: choose event → edit caption → edit keywords →
mark done → next stop. `Ctrl/⌘ + Enter` marks the current item done; arrow keys
move through queue rows when focus is on the queue.

Feedback originates from the changed element: the progress rail advances, a
toast rises from the bottom edge, and completed queue markers fill. UI motion
is 180–240 ms and only transforms/opacity. Under `prefers-reduced-motion`, all
translation and smooth scrolling are removed; state changes remain immediate.

## Original asset plan and provenance

The hero/empty-state artwork is a generated art-deco darkroom transit scene:
film frames travelling along a brass rail toward an illuminated archive
cabinet. It clarifies the queue metaphor and contains no UI claims.

Prompt sheet:

> Use case: stylized-concept. Asset type: PWA welcome and empty-state hero.
> A 1930s art-deco transit poster reimagined as a photographer's metadata
> workflow: a midnight-blue railway platform built from film-strip rails,
> cream archival catalog cards as train carriages, small brass keyword tags,
> and a glowing orderly archive at the finite end of the line. Flat gouache
> and screen-print texture, crisp geometric fan motifs, stepped architecture,
> strong diagonal perspective, generous quiet dark sky, restrained palette of
> midnight navy, warm ivory, antique brass, muted coral, and sage green. No
> people, no camera brands, no readable text, no letters, no numbers, no logos,
> no watermark, no gradients that look digital, no photorealism.

- Generation: Azure OpenAI factory image deployment via
  `/opt/fleet/lib/gen-image.sh`, 2026-08-28.
- License/provenance: original generated artwork commissioned for this product;
  source PNG and prompt JSON are retained in `assets/src/`.
- Delivery: responsive WebP, explicit dimensions, ≤300 KB.
- Icons and the route mark are hand-authored inline SVG/CSS geometric forms,
  original to this product.

