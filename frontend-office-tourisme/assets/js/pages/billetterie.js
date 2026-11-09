import { BILLETTERIE, TICKET_GROUPS } from '../data/content.js';
import { cartTotals, euro, getCart, setQuantity, ticketDateRange } from '../modules/cart.js';
import { ICONS } from '../modules/icons.js';
import { $, escapeHtml, formatLongDate, toast, visualSrc } from '../modules/utils.js';

const card = (item, qty) => {
  const range = ticketDateRange(item);
  return `
  <article class="ticket-card${qty ? ' is-selected' : ''}" id="${item.id}">
    <div class="visual ticket-card__visual"><img src="${visualSrc(item.visual)}" alt="" loading="lazy" /></div>
    <div class="ticket-card__body">
      <h3 class="ticket-card__title">${escapeHtml(item.title)}</h3>
      <p class="ticket-card__desc">${escapeHtml(item.description)}</p>
      <p class="ticket-card__validity">${range.available ? `Jusqu'au ${formatLongDate(range.max)}` : 'Complet'}</p>
      <div class="ticket-card__foot">
        <span class="ticket-card__price">${euro(item.amount)}</span>
        <div class="qty" role="group" aria-label="Quantité pour ${escapeHtml(item.title)}">
          <button type="button" data-qty="-1" data-id="${item.id}" aria-label="Retirer un billet" ${qty ? '' : 'disabled'}>−</button>
          <output aria-live="polite">${qty}</output>
          <button type="button" data-qty="1" data-id="${item.id}" aria-label="Ajouter un billet" ${range.available ? '' : 'disabled'}>+</button>
        </div>
      </div>
    </div>
  </article>`;
};

const render = () => {
  const cart = getCart();
  $('[data-tickets]').innerHTML = TICKET_GROUPS.map(
    (g) => `
    <section class="ticket-group anchor-section" id="${g.id}" aria-labelledby="group-${g.id}">
      <h2 class="ticket-group__title" id="group-${g.id}">${escapeHtml(g.title)}</h2>
      <div class="grid grid--3">${BILLETTERIE.filter((t) => t.group === g.id)
        .map((t) => card(t, cart[t.id]?.qty || 0))
        .join('')}</div>
    </section>`
  ).join('');

  const { count, amount } = cartTotals();
  $('[data-cart-summary]').hidden = count === 0;
  $('[data-cart-total]').textContent = `${count} billet${count > 1 ? 's' : ''} · ${euro(amount)}`;
};

const highlightTarget = () => {
  const id = window.location.hash.slice(1);
  const el = id && document.getElementById(id);
  if (!el || !el.classList.contains('ticket-card')) return;
  el.classList.add('is-highlighted');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => el.classList.remove('is-highlighted'), 2400);
};

export default function initBilletterie() {
  render();
  highlightTarget();
  $('[data-tickets]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-qty]');
    if (!b) return;
    const current = getCart()[b.dataset.id]?.qty || 0;
    const next = current + Number(b.dataset.qty);
    setQuantity(b.dataset.id, next);
    if (next > current) toast('Billet ajouté au panier');
    render();
    document.getElementById(b.dataset.id)?.querySelector(`[data-qty="${b.dataset.qty}"]`)?.focus();
  });
  $('[data-checkout]').innerHTML = `Voir mon panier ${ICONS.arrow}`;
}
