import { BONS_PLANS_DODO, BONS_PLANS_FOOD } from '../data/content.js';
import { HEBERGEMENTS, RESTAURANTS } from '../data/places.js';
import { placeCard, tileCard } from '../modules/cards.js';
import { syncHearts } from '../modules/favorites.js';
import { ICONS } from '../modules/icons.js';
import { $, $$, escapeHtml, normalize, params } from '../modules/utils.js';

const PAGE_SIZE = 9;
const VISIBLE_OPTIONS = 8;

const CONFIG = {
  manger: {
    items: RESTAURANTS,
    bonsPlans: BONS_PLANS_FOOD,
    groups: [
      { key: 'type', title: 'Type', get: (p) => [p.type] },
      { key: 'access', title: 'Accès', get: (p) => p.access },
      { key: 'days', title: "Jour d'ouverture", get: (p) => p.days },
      { key: 'hours', title: "Heures d'ouverture", get: (p) => p.hours },
      { key: 'public', title: 'Public', get: (p) => p.public },
      { key: 'labels', title: 'Labels et offres spéciales', get: (p) => p.labels },
    ],
  },
  dormir: {
    items: HEBERGEMENTS,
    bonsPlans: BONS_PLANS_DODO,
    groups: [
      { key: 'type', title: "Type d'hébergement", get: (p) => [p.type] },
      { key: 'district', title: 'Quartier', get: (p) => [p.district] },
      { key: 'access', title: 'Accès', get: (p) => p.access },
      { key: 'public', title: 'Public', get: (p) => p.public },
      { key: 'labels', title: 'Labels et offres spéciales', get: (p) => p.labels },
    ],
  },
};

const QUICK = [
  { key: 'bestSeller', label: 'Best-sellers' },
  { key: 'tested', label: 'Testé et approuvé' },
  { key: 'eco', label: 'Tourisme éco-responsable' },
];

const uniqueOptions = (items, get) => {
  const counts = new Map();
  items.forEach((item) => get(item).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1)));
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
};

export default function initListing(page) {
  const config = CONFIG[page];
  if (!config) return;

  const state = { search: '', quick: new Set(), selected: {}, page: 1 };
  config.groups.forEach((g) => {
    state.selected[g.key] = new Set();
  });

  const preset = params().get('filtre');
  if (preset) {
    const group = config.groups.find((g) => config.items.some((p) => g.get(p).includes(preset)));
    if (group) state.selected[group.key].add(preset);
  }

  const bonsPlans = $('[data-bons-plans]');
  if (bonsPlans) {
    bonsPlans.innerHTML = config.bonsPlans
      .map((b) => `<div>${tileCard({ title: b.title, href: `?filtre=${encodeURIComponent(b.filter)}#resultats`, visual: b.visual }, true)}</div>`)
      .join('');
  }

  const quick = $('[data-quick-filters]');
  quick.innerHTML = QUICK.map((q) => `<button class="pill pill--accent" type="button" aria-pressed="false" data-quick="${q.key}">${q.label}</button>`).join('');

  const groupsEl = $('[data-filter-groups]');
  groupsEl.innerHTML = config.groups
    .map((g) => {
      const options = uniqueOptions(config.items, g.get);
      if (options.length === 0) return '';
      return `
        <fieldset class="filter-group" data-group="${g.key}">
          <legend class="filter-group__title h4">${escapeHtml(g.title)}</legend>
          ${options
            .map(
              ([value, count], i) => `
            <label${i >= VISIBLE_OPTIONS ? ' hidden data-extra' : ''}>
              <input type="checkbox" value="${escapeHtml(value)}" ${state.selected[g.key].has(value) ? 'checked' : ''} />
              <span>${escapeHtml(value)}</span>
              <span class="filter-group__count">${count}</span>
            </label>`
            )
            .join('')}
          ${options.length > VISIBLE_OPTIONS ? `<button class="filter-group__more" type="button" data-more>Voir ${options.length - VISIBLE_OPTIONS} plus</button>` : ''}
        </fieldset>`;
    })
    .join('');

  const grid = $('[data-results]');
  const count = $('[data-results-count]');
  const pagination = $('[data-pagination]');

  const matches = (item) => {
    if (state.search) {
      const hay = normalize(`${item.name} ${item.type} ${item.district} ${item.description}`);
      if (!hay.includes(normalize(state.search))) return false;
    }
    for (const q of state.quick) if (!item[q]) return false;
    return config.groups.every((g) => {
      const sel = state.selected[g.key];
      if (sel.size === 0) return true;
      return g.get(item).some((v) => sel.has(v));
    });
  };

  const render = () => {
    const results = config.items.filter(matches);
    const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const slice = results.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    count.textContent = `${results.length} offre${results.length > 1 ? 's' : ''} trouvée${results.length > 1 ? 's' : ''}`;
    grid.innerHTML = slice.length
      ? slice.map((p) => placeCard(p)).join('')
      : `<div class="results__empty" style="grid-column: 1 / -1"><p>Aucune offre ne correspond à vos critères.</p><button class="btn btn--outline btn--sm" type="button" data-reset>Effacer les filtres</button></div>`;
    syncHearts(grid);

    pagination.innerHTML =
      pages > 1
        ? Array.from({ length: pages }, (_, i) => `<button type="button" data-goto-page="${i + 1}"${i + 1 === state.page ? ' aria-current="page"' : ''} aria-label="Page ${i + 1}">${i + 1}</button>`).join('')
        : '';
  };

  const reset = () => {
    state.search = '';
    state.quick.clear();
    Object.values(state.selected).forEach((s) => s.clear());
    state.page = 1;
    $('[data-search]').value = '';
    $$('input[type="checkbox"]', groupsEl).forEach((c) => {
      c.checked = false;
    });
    $$('[data-quick]', quick).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    render();
  };

  groupsEl.addEventListener('change', (e) => {
    const input = e.target;
    const group = input.closest('[data-group]')?.dataset.group;
    if (!group) return;
    if (input.checked) state.selected[group].add(input.value);
    else state.selected[group].delete(input.value);
    state.page = 1;
    render();
  });

  groupsEl.addEventListener('click', (e) => {
    const more = e.target.closest('[data-more]');
    if (!more) return;
    const fieldset = more.closest('fieldset');
    $$('[data-extra]', fieldset).forEach((l) => {
      l.hidden = false;
    });
    more.remove();
  });

  quick.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quick]');
    if (!b) return;
    const key = b.dataset.quick;
    if (state.quick.has(key)) state.quick.delete(key);
    else state.quick.add(key);
    b.setAttribute('aria-pressed', String(state.quick.has(key)));
    state.page = 1;
    render();
  });

  $('[data-search]').addEventListener('input', (e) => {
    state.search = e.target.value.trim();
    state.page = 1;
    render();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) reset();
    const pageBtn = e.target.closest('[data-goto-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.gotoPage);
      render();
      $('#resultats').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const toggle = $('[data-filters-toggle]');
  const filters = $('[data-filters]');
  toggle.innerHTML = `${ICONS.filter} Filtrer les offres`;
  toggle.addEventListener('click', () => {
    const open = filters.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  render();
}
