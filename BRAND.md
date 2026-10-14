# CSA Volleyball brand, as built

This file reconciles the two brand sources in the program's Dropbox folder (*CSA Volleyball — Brand Guidelines.md*, v1.0, April 2026, and *brand-tokens.md*) with what the website and the handbooks actually use. Where they differ, this file says which one wins and why. The tokens live in `website/styles.css` (`:root`); the handbooks keep their own small palette in each file under `handbooks/src/`.

## Colours

The two sources agree on every colour below. The site uses all of them with the same hex values.

| Token (`styles.css`) | Hex | Brand-source name | Used for |
|---|---|---|---|
| `--blue` | `#1A4F9C` | CSA Blue | Header, hero bands, links on light backgrounds, focus ring on light backgrounds |
| `--blue-dark` | `#133a75` | CSA Blue Dark | Mobile menu, hover on the division cards |
| `--blue-light` | `#2563c4` | CSA Blue Light | Handbook shelf accents |
| `--midnight` | `#0f1f3d` | Hero Midnight | Dark sections, footer, court-diagram frame |
| `--red` | `#C0272D` | CSA Red | Calls to action, the 4px top accent line, active states |
| `--red-dark` | `#9a1f24` | CSA Red Dark | Hover on red buttons; small red labels on white (8.1:1, where CSA Red is 5.9:1) |
| `--paper` | `#f8f9fc` | CSA Off-White | Light section backgrounds (was `#f6f8fc`; aligned in this change) |
| — | `#FFFFFF` | CSA White | Text on dark, cards |

Added by the site (not in either source), each for one job:

| Token | Hex | Why |
|---|---|---|
| `--ink` | `#13213a` | Body text: 16:1 on white, softer than black |
| `--muted` | `#4d5c74` | Secondary text: 6.8:1 on white, passes AA |
| `--rule` | `#dbe3ef` | Hairlines and table rules |
| `--maple`, `--maple-deep` | `#e5bd85`, `#b9854a` | The court floor in the diagrams, and accents; never body text (`--maple-deep` is 3.2:1 on white) |
| `--focus-light` | `#1A4F9C` | Keyboard focus ring on light backgrounds (7.9:1 on white) |
| `--focus-dark` | `#ffcf32` | Keyboard focus ring on midnight (11:1), blue (5.4:1) and red (4:1) |

Not used, on purpose:

- **Hero gradient** (`#0f1f3d → #1A4F9C → #133a75`): the redesigned hero uses a flat midnight band so the court illustration reads clearly.
- **Red Glow `#ff8a8e`, glass cards, pill badges**: patterns from the retired Manus build; the site has no stat counters.
- **Drill focus colours** (amber, green, violet…): the drill library filters by skill with text buttons instead of colour, so nothing depends on telling colours apart.
- **Float, pulse and parallax animations**: dropped. Motion is limited to the grade court, the rotation demo and the plan diagrams, and all of it stops when the device asks for reduced motion.

## Contrast rules

- Never red text on blue, or blue on red (1.35:1).
- White on CSA Blue is 7.9:1 and white on CSA Red is 5.9:1: both fine for text and buttons.
- Yellow focus ring only on dark or coloured backgrounds; blue focus ring everywhere else.

## Type

| Role | Website | Handbooks (print) |
|---|---|---|
| Display: page titles, section titles | Bebas Neue 400 | Barlow Condensed 800 |
| Subheads: card titles, labels | Barlow Condensed 600–700 | Barlow Condensed 700 |
| Body and UI | Inter 400–700 | Barlow 400–600 |

The website follows the brand guidelines. The handbooks were set in Barlow before the guidelines existed and are left that way: they are print documents with their own consistent system, and resetting 37 pages of the Master Handbook in a different face is a re-layout, not a token change. Both load from Google Fonts; the PDF build (`npm run pdf`) needs network access to fetch them.

## Logo

- Use the CSA mark from this repo (`website/assets/csa-logo-200.png` for the header, `handbooks/src/csa_logo.jpg` for print and the share card). The brand sources point to files on the retired Manus build's CDN; don't hotlink those.
- The mark sits on CSA Blue or on its own blue box. Never on red. Minimum 32px tall on screen.

## Names and titles

- Program: **CSA Volleyball** (Cajun Sports Association, Lafayette, Louisiana).
- Stephanie Abdalla's title is **Volleyball Director**, as in her handbooks. (*brand-tokens.md* has "Program Director" in a signature block; the handbooks win.)
- Every document carries her byline and the edition: "By Stephanie Abdalla, CSA Volleyball Director · October 2026 edition". Both come from `data/facts.json` (`documents.byline`, `documents.edition`).
- The signature block in *brand-tokens.md* lists a Manus web address and an email that have not been confirmed. Contact details appear on the site only once they are in `data/facts.json`.

## Voice

From the brand guidelines, and it holds: direct, encouraging, parent-friendly, like a knowledgeable coach on the sideline. Active voice, short sentences, specific grades and dates. No superlatives, no exclamation marks in running text. Motto: *Build skills. Build confidence. Have fun.*

## Share card

`website/assets/og-image.png` (1200×630) is drawn by `npm run og-image` from the facts file and the logo. Re-run it if the motto, place, grades or the director's name change.
