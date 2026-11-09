import { DECOUVRIR_THEMES } from '../data/content.js';
import { LIEUX } from '../data/places.js';
import { placeCard, tileCard } from '../modules/cards.js';
import { $ } from '../modules/utils.js';

export default function initDecouvrir() {
  const grid = $('[data-themes]');
  if (grid) grid.innerHTML = DECOUVRIR_THEMES.map((t) => tileCard(t)).join('');

  const places = $('[data-lieux]');
  if (places) places.innerHTML = LIEUX.map((p) => `<div>${placeCard(p)}</div>`).join('');
}
