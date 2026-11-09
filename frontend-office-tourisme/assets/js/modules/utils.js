export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const visualSrc = (name) => `assets/img/photos/${name}.jpg`;

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const parseDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const short = (date) => `${String(date.getDate()).padStart(2, '0')} ${MONTHS_SHORT[date.getMonth()]}`;

export const formatRange = (startIso, endIso) => {
  const start = parseDay(startIso);
  const end = parseDay(endIso);
  if (startIso === endIso) return `${short(start)} ${start.getFullYear()}`;
  const startLabel = start.getFullYear() === end.getFullYear() ? short(start) : `${short(start)} ${start.getFullYear()}`;
  return `${startLabel} -> ${short(end)} ${end.getFullYear()}`;
};

export const formatLongDate = (iso) => {
  const d = parseDay(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

export const isOnDay = (event, day) => {
  const t = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return parseDay(event.start).getTime() <= t && t <= parseDay(event.end).getTime();
};

export const params = () => new URLSearchParams(window.location.search);

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return undefined;
    }
    return undefined;
  },
};

let toastTimer;
export const toast = (message) => {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2600);
};

export const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
