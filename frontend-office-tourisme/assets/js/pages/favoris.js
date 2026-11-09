import { findEvent } from '../data/events.js';
import { findPlace } from '../data/places.js';
import { eventCard, placeCard } from '../modules/cards.js';
import { getFavorites, syncHearts } from '../modules/favorites.js';
import { ICONS } from '../modules/icons.js';
import { $ } from '../modules/utils.js';

const render = () => {
  const root = $('[data-favorites]');
  const cards = getFavorites()
    .map((ref) => {
      const [kind, id] = ref.split(':');
      if (kind === 'place') {
        const p = findPlace(id);
        return p ? placeCard(p) : '';
      }
      const e = findEvent(id);
      return e ? eventCard(e) : '';
    })
    .filter(Boolean);

  $('[data-favorites-count]').textContent = `${cards.length} favori${cards.length > 1 ? 's' : ''}`;
  root.innerHTML = cards.length
    ? `<div class="results__grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">${cards.join('')}</div>`
    : `<div class="empty-favorites"><p>Vous n'avez pas encore de favoris. Cliquez sur le cœur d'une sortie, d'un restaurant ou d'un hébergement pour le retrouver ici.</p><a class="btn" href="sortir.html">Voir les sorties ${ICONS.arrow}</a></div>`;
  syncHearts(root);
};

export default function initFavoris() {
  render();
  document.addEventListener('favorites:change', render);
}
