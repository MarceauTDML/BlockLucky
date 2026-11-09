import { EVENT_CATEGORIES, EVENTS } from '../data/events.js';
import { LIEUX } from '../data/places.js';
import { eventCard, placeCard } from '../modules/cards.js';
import { syncHearts } from '../modules/favorites.js';
import { $, $$, normalize } from '../modules/utils.js';
import { filterAgenda } from './home.js';

export default function initSortir() {
  const state = { when: 'all', category: 'all', search: '' };
  const grid = $('[data-events]');
  const count = $('[data-events-count]');

  const catEl = $('[data-categories]');
  catEl.innerHTML = ['Toutes', ...EVENT_CATEGORIES]
    .map((c, i) => `<button class="pill pill--accent" type="button" data-category="${i === 0 ? 'all' : c}" aria-pressed="${i === 0}">${c}</button>`)
    .join('');

  const render = () => {
    let list = filterAgenda(state.when);
    if (state.category !== 'all') list = list.filter((e) => e.category === state.category);
    if (state.search) list = list.filter((e) => normalize(`${e.title} ${e.place} ${e.description}`).includes(normalize(state.search)));
    count.textContent = `${list.length} sortie${list.length > 1 ? 's' : ''} trouvée${list.length > 1 ? 's' : ''}`;
    grid.innerHTML = list.length
      ? list.map((e) => eventCard(e)).join('')
      : `<div class="results__empty" style="grid-column: 1 / -1"><p>Aucune sortie pour cette sélection. Essayez une autre date ou catégorie.</p></div>`;
    syncHearts(grid);
  };

  $$('[data-when]').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.when = btn.dataset.when;
      $$('[data-when]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    })
  );

  catEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-category]');
    if (!b) return;
    state.category = b.dataset.category;
    $$('[data-category]', catEl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });

  $('[data-event-search]').addEventListener('input', (e) => {
    state.search = e.target.value.trim();
    render();
  });

  const venues = $('[data-venues]');
  if (venues) venues.innerHTML = LIEUX.filter((l) => l.universe === 'sortir').map((p) => `<div>${placeCard(p)}</div>`).join('');

  render();
}
