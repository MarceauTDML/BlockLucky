import { EVENTS } from '../data/events.js';
import { ARTICLES, INCONTOURNABLES } from '../data/content.js';
import { eventCard, postCard, tileCard } from '../modules/cards.js';
import { syncHearts } from '../modules/favorites.js';
import { $, $$, isOnDay } from '../modules/utils.js';

const DAY = 24 * 60 * 60 * 1000;

const weekendDays = (today) => {
  const day = today.getDay();
  const toSaturday = (6 - day + 7) % 7;
  const saturday = new Date(today.getTime() + (day === 0 ? -1 : toSaturday) * DAY);
  return [saturday, new Date(saturday.getTime() + DAY)];
};

export const filterAgenda = (filter, events = EVENTS, today = new Date()) => {
  if (filter === 'today') return events.filter((e) => isOnDay(e, today));
  if (filter === 'tomorrow') return events.filter((e) => isOnDay(e, new Date(today.getTime() + DAY)));
  if (filter === 'weekend') {
    const days = weekendDays(today);
    return events.filter((e) => days.some((d) => isOnDay(e, d)));
  }
  return events;
};

const renderAgenda = (filter) => {
  const track = $('[data-agenda-track]');
  if (!track) return;
  let list = filterAgenda(filter);
  if (list.length === 0) list = EVENTS;
  track.innerHTML = list.map((e) => `<div>${eventCard(e)}</div>`).join('');
  syncHearts(track);
  track.closest('[data-slider]')?.refreshSlider?.();
};

export default function initHome() {
  const incontournables = $('[data-incontournables]');
  if (incontournables) incontournables.innerHTML = INCONTOURNABLES.map((i) => `<div>${tileCard(i)}</div>`).join('');

  const posts = $('[data-posts]');
  if (posts) posts.innerHTML = ARTICLES.map((a) => `<div>${postCard(a)}</div>`).join('');

  renderAgenda('today');
  $$('[data-agenda-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-agenda-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      renderAgenda(btn.dataset.agendaFilter);
    });
  });
}
