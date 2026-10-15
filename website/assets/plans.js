// Practice plan pages: copy the parent recap, print, and mark this week once the season dates are set.
(() => {
  const status = document.querySelector('.copy-status');
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const box = document.querySelector(btn.dataset.copy);
    const text = [...box.querySelectorAll('p')].map(p => p.textContent.trim()).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = 'Copied. Paste it into your team chat.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(box);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      if (status) status.textContent = 'Selected. Press Ctrl+C or Cmd+C to copy.';
    }
  }));
  document.querySelectorAll('[data-print]').forEach(btn => btn.addEventListener('click', () => window.print()));

  const dataEl = document.getElementById('season-data');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  if (!data.weekOneStart) return;
  const [y, m, d] = data.weekOneStart.split('-').map(Number);
  const now = new Date();
  const days = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
  const note = document.getElementById('season-now');
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  if (days < 0) {
    if (note) { note.textContent = `The season starts the week of ${fmt.format(new Date(Date.UTC(y, m - 1, d)))}.`; note.hidden = false; }
    return;
  }
  const n = Math.floor(days / 7) + 1;
  if (n > 9) return;
  const week = data.weeks.find(w => w.n === n);
  if (note) { note.textContent = `This week is week ${n}: ${week.title}.`; note.hidden = false; }
  document.querySelectorAll('a[data-week-link]').forEach(a => { a.href = `/plans/${a.dataset.weekLink}/week-${n}/`; });
  const card = document.querySelector(`.week-cards li[data-week="${n}"]`);
  if (card) {
    card.classList.add('now');
    const tag = card.querySelector('.this-week');
    if (tag) tag.hidden = false;
  }
})();
