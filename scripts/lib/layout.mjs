import { esc, fmtDate, telLink } from './util.mjs';

const FONTS = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap';

/** Main navigation. On the home page, in-page sections use #anchors; elsewhere they point back home. */
export function navItems(home) {
  const h = id => (home ? `#${id}` : `/#${id}`);
  return [
    { key: 'plans', href: home ? '#season' : '/plans/', text: 'Season plan' },
    { key: 'coaches', href: '/coaches/', text: 'Coaches' },
    { key: 'families', href: h('families'), text: 'Families' },
    { key: 'method', href: '/method/', text: 'The method' },
    { key: 'handbooks', href: home ? '#resources' : '/handbooks/', text: 'Handbooks' },
    { key: 'contact', href: h('contact'), text: 'Get in touch', cta: true }
  ];
}

export function header({ home = false, active = '', path = '' } = {}) {
  const links = navItems(home).map(n => {
    const cls = n.cta ? ' class="nav-cta"' : '';
    // "page" only on the page itself; elsewhere in its section the link is marked current, not "page"
    const cur = n.key === active ? ` aria-current="${n.href === path ? 'page' : 'true'}"` : '';
    return `        <a href="${n.href}"${cls}${cur}>${esc(n.text)}</a>`;
  }).join('\n');
  return `  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="${home ? '#top' : '/'}" aria-label="CSA Volleyball home">
        <img src="/assets/csa-logo-200.png" alt="" width="84" height="40">
        <span>Volleyball</span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
      <nav id="nav" class="nav" aria-label="Main navigation">
${links}
      </nav>
    </div>
  </header>`;
}

export function footer(facts, { home = false } = {}) {
  return `  <footer>
    <div class="wrap footer-inner">
      <p><strong>${esc(facts.program.name)}</strong><span>${esc(facts.program.organization)}, ${esc(facts.program.place)}</span></p>
      <p class="motto">${esc(facts.program.motto)}</p>
      <a href="${home ? '#top' : '#main'}">Back to top</a>
    </div>
    <div class="wrap footer-links">
      <nav aria-label="Site pages">
        <a href="/plans/">Practice plans</a>
        <a href="/drills/">Drill library</a>
        <a href="/coaches/">For coaches</a>
        <a href="/method/">The method</a>
        <a href="/handbooks/">Handbooks</a>
      </nav>
      <p>Curriculum, rules by grade and handbooks by ${esc(facts.director.name)}, ${esc(facts.director.title)}.</p>
    </div>
  </footer>`;
}

/** Head tags that come from the facts: canonical URL, share card, analytics. */
export function headMeta(facts, { path = '/', title, description, noindex = false }) {
  const url = facts.site.url + path;
  return [
    noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(facts.site.url)}/assets/og-image.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    facts.site.analytics ? `<script defer src="/_vercel/insights/script.js"></script>` : null
  ].filter(Boolean).join('\n  ');
}

/** A full page for everything except the home page. */
export function page(facts, { path, title, description, active = '', body, scripts = [], bodyClass = 'sub', noindex = false }) {
  const fullTitle = title === facts.program.name ? title : `${title} | ${facts.program.name}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0f1f3d">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  ${headMeta(facts, { path, title: fullTitle, description, noindex })}
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${FONTS}" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages.css">
</head>
<body class="${bodyClass}">
${header({ active, path })}

  <main id="main">
${body}
  </main>

${footer(facts)}
  <script src="/assets/nav.js" defer></script>
${scripts.map(s => `  <script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

/** Contact line for the director, from the facts. */
export function directorContact(facts, { html = true } = {}) {
  const d = facts.director;
  const parts = [];
  if (d.email) parts.push(html ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : d.email);
  if (d.phone) parts.push(html ? telLink(d.phone) : d.phone);
  return parts;
}

/** The one-line season status used in the strip under the hero and on plan pages. */
export function seasonStatus(facts) {
  const s = facts.season;
  const known = s.name || s.weekOneStart || s.registrationUrl || s.fee;
  if (!known) {
    return {
      text: '<strong>Season dates, fees, and registration</strong> will be posted here once CSA confirms them for the coming season.',
      link: { href: facts.program.csaPage, text: 'Check CSA’s volleyball page' }
    };
  }
  const bits = [];
  if (s.name) bits.push(`<strong>${esc(s.name)}</strong>`);
  if (s.registrationOpens && s.registrationCloses) bits.push(`Registration ${esc(fmtDate(s.registrationOpens))} – ${esc(fmtDate(s.registrationCloses))}`);
  else if (s.registrationCloses) bits.push(`Register by ${esc(fmtDate(s.registrationCloses))}`);
  if (s.fee) bits.push(`Fee ${esc(s.fee)}`);
  if (s.weekOneStart) bits.push(`Week 1 starts ${esc(fmtDate(s.weekOneStart))}`);
  if (s.tournamentDate) bits.push(`Tournament ${esc(fmtDate(s.tournamentDate))}`);
  if (s.weekOneStart) bits.push('<a href="/season.ics">Add the season to your calendar</a>');
  const coming = [!s.weekOneStart && 'practice dates', !s.fee && 'the fee', !(s.registrationUrl || s.registrationOpens || s.registrationCloses) && 'registration'].filter(Boolean);
  if (coming.length) {
    const list = coming.length > 1 ? `${coming.slice(0, -1).join(', ')} and ${coming.at(-1)}` : coming[0];
    bits.push(`${list[0].toUpperCase()}${list.slice(1)} will be posted here once CSA confirms ${coming.length > 1 || coming[0] === 'practice dates' ? 'them' : 'it'}`);
  }
  return {
    text: bits.join(' · '),
    link: s.registrationUrl
      ? { href: s.registrationUrl, text: 'Register on CSA’s site' }
      : { href: facts.program.csaPage, text: 'Check CSA’s volleyball page' }
  };
}

/** Link to the season calendar file, once the dates exist (the build writes /season.ics then). */
export const calendarLink = facts => (facts.season.weekOneStart
  ? '<p class="cal-link"><a href="/season.ics">Add the season to your calendar</a>: the nine weeks, registration dates and the tournament.</p>'
  : '');
