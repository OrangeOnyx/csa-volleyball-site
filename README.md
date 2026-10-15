# CSA Volleyball website

The public site for CSA Volleyball (Cajun Sports Association, Lafayette, Louisiana): the season plan, practice plans by grade, the coach guide, the drill library, Stephanie Abdalla's method, and the five handbooks, free to read online or download.

Curriculum, practice plans, rules by grade and handbooks are by **Stephanie Abdalla, CSA Volleyball Director**.

## How it fits together

| Folder | What it is | Edit it? |
|---|---|---|
| `data/facts.json` | Every program fact: dates, fee, contacts, venues, divisions, rules by grade, edition. `null` means not confirmed yet and shows as "to be confirmed". | Yes: this is where facts change |
| `data/plans.json` | The nine-week plan, split by division, from Stephanie's Season Curriculum & Practice Plan Guide | Yes |
| `data/drills.json` | The drill library (her six, plus the named activities from the weekly plans) | Yes |
| `data/scenes.json` | The animated court diagrams on the plan pages | Yes |
| `handbooks/src/` | The five handbooks as HTML, with `{{facts}}` tokens. The same files make the web pages and the PDFs. | Yes, for handbook text |
| `scripts/` | The build and the checks | Rarely |
| `website/` | What Vercel serves. Generated pages are committed. | Only `index.html`, `styles.css`, `site.js` and the files in `assets/` by hand |

Vercel serves `website/` as plain files (root directory `website/`, no build step). So after any change to `data/` or `handbooks/src/`, run the build and commit what it writes. The checks in CI fail if the committed pages are out of date.

## Common jobs

**Confirm a fact** (season dates, fee, phone, registration link):

1. Edit `data/facts.json`. Set `confirmed.date` and `confirmed.by` too.
2. `npm run build` — updates every page that shows the fact; prints what is still unconfirmed.
3. `npm run pdf` — regenerates the five PDFs and the ZIP if the fact appears in a handbook.
4. `npm run check`, then commit and open a pull request.

Setting `season.weekOneStart` (the Monday of the first practice week) also turns on the "This week" line on the home page, the plan overview pages and the coach guide, and writes `website/season.ics` (the season calendar file).

**Change a practice plan or drill:** edit `data/plans.json` or `data/drills.json`, then `npm run build`. The build stops with a message if a week is missing a segment for a division or points to a drill or diagram that doesn't exist.

**Change a handbook:** edit the file in `handbooks/src/`, bump `documents.edition` in the facts file for a new edition, then `npm run build && npm run pdf`.

**Turn on visitor counts:** enable Web Analytics for the project in Vercel (it sets no cookies), then set `site.analytics` to `true` and build.

**Collect coach feedback:** make the three-question form (see `/coaches/feedback/`), put its link in `feedback.formUrl`, build.

## Setup

```sh
npm ci                                   # Node 22
pip install weasyprint==66.0             # only for npm run pdf
npx playwright install chromium          # only for check:a11y and og-image
```

| Command | Does |
|---|---|
| `npm run build` | Writes the plan pages, method, coach guide, drill library, handbook pages, sitemap and robots file, and fills the facts into the home page |
| `npm run pdf` | Writes the five PDFs and the all-in-one ZIP from `handbooks/src/` (needs network access for the fonts) |
| `npm run check` | Facts schema, HTML validity, every internal link and anchor, the sitemap, no leftover placeholders, byline and edition in every PDF |
| `npm run check:a11y` | Loads every page in Chromium and runs axe (WCAG 2.2 AA); fails on violations, script errors or sideways scrolling on phones. Then plays each court diagram once with motion on, steps through it by keyboard, and checks every step's drawing: no call-out on the net, a court label, another player or the ball, and no pass or set on our side drawn over the net |
| `npm run serve` | Serves `website/` at http://localhost:4173 the way Vercel does |
| `npm run og-image` | Redraws the link-preview card, `website/assets/og-image.png` |

Brand colours, type and naming are in [BRAND.md](BRAND.md).
