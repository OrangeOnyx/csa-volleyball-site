import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITE = join(ROOT, 'website');
export const TBC = 'To be confirmed';

export const readJSON = rel => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
export const readText = rel => readFileSync(join(ROOT, rel), 'utf8');

/** Write a file under website/, creating folders. Returns the site-relative path. */
export function writeSite(rel, content) {
  const abs = join(SITE, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, rel.endsWith('.html') ? tidy(content) : content);
  return rel;
}

/** Drop trailing spaces that template literals leave behind (the HTML check rejects them). */
export const tidy = html => html.replace(/[ \t]+$/gm, '');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

/** Typographic quotes for text that came from plain JSON strings. */
export const curly = s => String(s)
  .replace(/(^|[\s(“—-])"(?=\S)/g, '$1“')
  .replace(/"/g, '”')
  .replace(/(\w)'(\w)/g, '$1’$2')
  .replace(/(^|\s)'(?=\S)/g, '$1‘')
  .replace(/'/g, '’');

/** Look up a dotted path such as "director.phone" in the facts. */
export const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2027-03-01" -> "March 1, 2027" (no time zone shifts: dates are calendar dates). */
export function fmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Fill {{path}} and {{path|fallback}} tokens from the facts. Null values use the fallback or "To be confirmed". */
export function fillTokens(text, facts) {
  return text.replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g, (_, path, fallback) => {
    const v = get(facts, path);
    if (v == null || v === '') return fallback != null ? fallback : TBC;
    return String(v);
  });
}

export const gradeWord = n => ['1st', '2nd', '3rd', '4th', '5th', '6th'][n - 1];
export const divisionOfGrade = (facts, g) => facts.divisions.find(d => d.grades.includes(Number(g)));

/** Drill group size as words: "2" -> "2 players", "Coach + 1" -> "Coach + 1 player", "Full team" stays. */
export function playersText(p) {
  const s = String(p ?? '').trim();
  if (!s) return '';
  if (s === '1') return '1 player';
  if (/^\d+\+$/.test(s)) return 'Any number of players';
  if (/^\d+(?:[–-]\d+)?$/.test(s)) return `${s} players`;
  if (/^coach \+ 1$/i.test(s)) return 'Coach + 1 player';
  const m = s.match(/^(\d+) \+ coach$/i);
  if (m) return `${m[1]} players + coach`;
  return s;
}

/** Phone for a tel: link: US numbers as +1 and ten digits, short codes such as 911 as they are. */
export function telHref(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? 'tel:+1' + digits.slice(-10) : 'tel:' + digits;
}
/** A tappable phone number that never wraps mid-number (class "tel" sets white-space: nowrap). */
export const telLink = (phone, text = phone) => `<a class="tel" href="${telHref(phone)}">${esc(text)}</a>`;
