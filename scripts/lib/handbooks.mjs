import { readText, esc, fillTokens } from './util.mjs';
import { headMeta } from './layout.mjs';

/** The five handbooks. Each one has a single source in handbooks/src that makes both the web page and the PDF. */
export const HANDBOOKS = [
  { slug: 'player-parent-handbook', pdf: 'CSA_Volleyball_Player_Parent_Handbook.pdf', title: 'Player & Parent Handbook', audience: 'For families', blurb: 'Expectations, conduct, facilities, and safety', shelfClass: 'fam', description: 'What CSA Volleyball expects of players and parents: the player pledge, what to bring, sideline conduct, and who to contact.' },
  { slug: 'master-handbook', pdf: 'CSA_Volleyball_Master_Handbook.pdf', title: 'Master Handbook', audience: 'For everyone', blurb: 'Program policies, rules, and procedures', shelfClass: 'all', description: 'The CSA Volleyball program handbook: mission, rules by grade, facility rules, coach and parent expectations, SafeSport, emergency plan and tournament.' },
  { slug: 'curriculum-guide', pdf: 'CSA_Volleyball_Curriculum_Practice_Guide.pdf', title: 'Curriculum & Practice Guide', audience: 'For coaches', blurb: 'The nine-week plan and drill library', shelfClass: 'coach', description: 'The CSA Volleyball nine-week season curriculum and practice plan guide, with the drill library.' },
  { slug: 'quick-reference-card', pdf: 'CSA_Volleyball_Coach_Quick_Reference_Card.pdf', title: 'Quick Reference Card', audience: 'For coaches', blurb: 'Game rules and reminders. Print it and laminate it.', shelfClass: 'coach', description: 'The two-sided CSA Volleyball coach quick reference card: game rules, serving by grade, conduct and emergency steps.' },
  { slug: 'coach-agreement', pdf: 'CSA_Volleyball_Coach_Agreement.pdf', title: 'Coach Agreement', audience: 'For coaches', blurb: 'Blank agreement and code of conduct', shelfClass: 'coach', description: 'The CSA Volleyball coach agreement and code of conduct, to sign and return before the first practice.' }
];

const DOC_FONTS = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600&display=swap';

/* Tables scroll sideways on phones, so each sits in a labelled, focusable region: keyboard
   users can scroll it and screen readers hear what it holds. The label is the nearest heading
   before the table, else its column headers; repeats get a number so every label is unique. */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const plain = t => t.replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k) => ENT[k]).replace(/\s+/g, ' ').trim();
const HEADING = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<div class="card-section-title[^"]*">([\s\S]*?)<\/div>/g;
function wrapTables(body) {
  const used = new Map();
  return body.replace(/<table[\s\S]*?<\/table>/g, (table, offset, whole) => {
    let heading = null;
    for (const m of whole.slice(0, offset).matchAll(HEADING)) heading = plain(m[2] ?? m[3]);
    const heads = [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m => plain(m[1])).filter(Boolean);
    let label = `Table: ${heading || heads.join(', ') || 'details'}`;
    const n = (used.get(label) || 0) + 1;
    used.set(label, n);
    if (n > 1) label += ` (${n})`;
    return `<section class="hb-table" tabindex="0" aria-label="${esc(label)}">${table}</section>`;
  });
}

/** The web version of a handbook: the source document, restyled for screens, inside a slim site bar. */
export function renderHandbookWeb(h, facts) {
  const src = fillTokens(readText(`handbooks/src/${h.slug}.html`), facts);
  const css = (src.match(/<style>([\s\S]*?)<\/style>/) || [null, ''])[1].replace(/@import url\([^)]*\);?/g, '').trim();
  let body = src.slice(src.indexOf('<body>') + '<body>'.length, src.lastIndexOf('</body>'));
  body = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/src="csa_logo\.jpg"/g, 'src="/handbooks/csa-logo.jpg"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  body = wrapTables(body);
  // One h1 per page: a later h1 that repeats the first (side 2 of the reference card) becomes an h2.
  const first = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  if (first) {
    let seen = false;
    body = body.replace(/<h1(\b[^>]*)>([\s\S]*?)<\/h1>/g, (m, attrs, inner) => {
      if (!seen) { seen = true; return m; }
      return plain(inner) === plain(first[1]) ? `<h2${attrs} class="hb-title-repeat">${inner}</h2>` : m;
    });
  }
  const title = `${h.title} | ${facts.program.name}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#1a4f9c">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(h.description)}">
  ${headMeta(facts, { path: `/handbooks/${h.slug}/`, title, description: h.description })}
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${DOC_FONTS}" rel="stylesheet">
  <style>
${css}
  </style>
  <link rel="stylesheet" href="/handbook.css">
</head>
<body class="hb hb-${h.slug}">
  <a class="hb-skip" href="#main">Skip to content</a>
  <header class="hb-bar">
    <a class="hb-home" href="/" aria-label="CSA Volleyball home"><img src="/assets/csa-logo-200.png" alt="" width="84" height="40"><span>Volleyball</span></a>
    <nav class="hb-nav" aria-label="Handbook">
      <a href="/handbooks/">All handbooks</a>
      <a class="hb-pdf" href="/resources/${h.pdf}">Download PDF</a>
    </nav>
  </header>
  <main id="main" class="hb-doc">
${body}
  </main>
  <footer class="hb-foot">
    <p>${esc(facts.documents.byline)} · ${esc(facts.documents.edition)} edition</p>
    <p><a href="/">CSA Volleyball home</a> · <a href="/handbooks/">All handbooks</a> · <a href="/resources/${h.pdf}">PDF version</a></p>
  </footer>
  <script src="/assets/nav.js" defer></script>
</body>
</html>
`;
}
