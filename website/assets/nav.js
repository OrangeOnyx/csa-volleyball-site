// Mobile menu, shared by every page.
(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#nav');
  if (!menu || !nav) return;
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.focus();
    }
  });
})();

// Tables that scroll sideways sit in focusable regions so a keyboard can scroll them. A region
// that fits needs no tab stop, so it only keeps one while it is wider than the screen.
(() => {
  const regions = [...document.querySelectorAll('.table-scroll[tabindex], .hb-table[tabindex]')];
  if (!regions.length) return;
  const sync = () => { for (const r of regions) r.tabIndex = r.scrollWidth > r.clientWidth + 1 ? 0 : -1; };
  sync();
  addEventListener('resize', sync);
  document.fonts?.ready.then(sync);
})();
