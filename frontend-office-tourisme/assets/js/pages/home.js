import { INCONTOURNABLES } from '../data/content.js';
import { tileCard } from '../modules/cards.js';
import { $ } from '../modules/utils.js';

export default function initHome() {
  const incontournables = $('[data-incontournables]');
  if (incontournables) incontournables.innerHTML = INCONTOURNABLES.map((i) => `<div>${tileCard(i)}</div>`).join('');
}
