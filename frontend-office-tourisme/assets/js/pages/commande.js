import { addToCart, cartLines, cartTotals, clearCart, createOrderNumber, euro, findOrder, saveOrder, setDate, setQuantity, ticketDateRange } from '../modules/cart.js';
import { ICONS } from '../modules/icons.js';
import { $, $$, escapeHtml, formatLongDate, params, storage, visualSrc } from '../modules/utils.js';

const STEPS = [
  { id: 'panier', label: 'Panier' },
  { id: 'coordonnees', label: 'Coordonnées' },
  { id: 'paiement', label: 'Paiement' },
  { id: 'confirmation', label: 'Confirmation' },
];
const DRAFT_KEY = 'etherbay.checkout';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^(\+33\s?|0)[1-9](\s?\d{2}){4}$/;
const ZIP = /^\d{5}$/;

let confirmedOrder = null;

const root = () => $('[data-checkout-root]');
const getDraft = () => storage.get(DRAFT_KEY, {});

const validateCustomer = (c) => {
  const errors = {};
  if (!c.firstName?.trim()) errors.firstName = 'Indiquez votre prénom.';
  if (!c.lastName?.trim()) errors.lastName = 'Indiquez votre nom.';
  if (!EMAIL.test(c.email || '')) errors.email = 'Indiquez une adresse email valide.';
  else if (c.email !== c.emailConfirm) errors.emailConfirm = 'Les deux adresses email ne correspondent pas.';
  if (c.phone && !PHONE.test(c.phone.trim())) errors.phone = 'Format attendu : 06 12 34 56 78 ou +33 6 12 34 56 78.';
  if (c.zip && !ZIP.test(c.zip.trim())) errors.zip = 'Le code postal doit comporter 5 chiffres.';
  if (!c.cgv) errors.cgv = 'Vous devez accepter les conditions générales de vente.';
  return errors;
};

const stepper = (current) => {
  const index = STEPS.findIndex((s) => s.id === current);
  return `
    <ol class="stepper" aria-label="Étapes de la commande">
      ${STEPS.map((s, i) => `
        <li class="stepper__item${i < index ? ' is-done' : ''}${i === index ? ' is-current' : ''}"${i === index ? ' aria-current="step"' : ''}>
          <span class="stepper__num">${i < index ? ICONS.check : i + 1}</span>
          <span class="stepper__label">${s.label}</span>
        </li>`).join('')}
    </ol>`;
};

const summary = (lines, editable = false) => {
  const { count, amount } = cartTotals(lines);
  return `
    <aside class="checkout-summary" aria-labelledby="summary-title">
      <h2 class="checkout-summary__title" id="summary-title">Récapitulatif</h2>
      <ul class="checkout-summary__lines">
        ${lines.map((l) => `<li><span>${l.qty} × ${escapeHtml(l.ticket.title)}<small>${formatLongDate(l.date)}</small></span><strong>${euro(l.total)}</strong></li>`).join('')}
      </ul>
      <p class="checkout-summary__total"><span>Total TTC (${count} billet${count > 1 ? 's' : ''})</span><strong>${euro(amount)}</strong></p>
      <ul class="checkout-summary__perks">
        <li>Billets électroniques à présenter sur smartphone</li>
        <li>Annulation gratuite jusqu'à 48 h avant la date</li>
        <li>Aucun frais de réservation</li>
      </ul>
      ${editable ? '' : `<a class="checkout-summary__edit" href="#panier">Modifier mon panier</a>`}
    </aside>`;
};

const emptyCart = () => `
  <div class="empty-favorites">
    <p>Votre panier est vide. Choisissez une visite, un pass ou un événement dans la billetterie.</p>
    <a class="btn" href="billetterie.html">Voir la billetterie ${ICONS.arrow}</a>
  </div>`;

const renderCart = (lines) => {
  if (!lines.length) return stepper('panier') + emptyCart();
  return `${stepper('panier')}
    <div class="checkout">
      <section class="checkout-main" aria-labelledby="step-title">
        <h2 class="checkout-main__title" id="step-title" tabindex="-1">Votre panier</h2>
        <ul class="cart-lines">
          ${lines.map((l) => {
            const range = ticketDateRange(l.ticket);
            return `
            <li class="cart-line" data-line="${l.ticket.id}">
              <div class="visual cart-line__visual"><img src="${visualSrc(l.ticket.visual)}" alt="" /></div>
              <div class="cart-line__info">
                <h3 class="cart-line__title">${escapeHtml(l.ticket.title)}</h3>
                <p class="cart-line__price">${euro(l.ticket.amount)} / billet</p>
                <label class="cart-line__date">Date de visite
                  <input type="date" value="${l.date}" min="${range.min}" max="${range.max}" data-date="${l.ticket.id}" required />
                </label>
              </div>
              <div class="cart-line__actions">
                <div class="qty" role="group" aria-label="Quantité pour ${escapeHtml(l.ticket.title)}">
                  <button type="button" data-line-qty="-1" data-id="${l.ticket.id}" aria-label="Retirer un billet">−</button>
                  <output aria-live="polite">${l.qty}</output>
                  <button type="button" data-line-qty="1" data-id="${l.ticket.id}" aria-label="Ajouter un billet">+</button>
                </div>
                <strong class="cart-line__total">${euro(l.total)}</strong>
                <button class="cart-line__remove" type="button" data-remove="${l.ticket.id}">Supprimer</button>
              </div>
            </li>`;
          }).join('')}
        </ul>
        <div class="checkout-actions">
          <a class="btn btn--outline" href="billetterie.html">Continuer mes achats</a>
          <a class="btn" href="#coordonnees">Passer à mes coordonnées ${ICONS.arrow}</a>
        </div>
      </section>
      ${summary(lines, true)}
    </div>`;
};

const field = (name, label, value, error, attrs = '') => `
  <div class="form-field${error ? ' has-error' : ''}">
    <label for="f-${name}">${label}</label>
    <input id="f-${name}" name="${name}" value="${escapeHtml(value || '')}" ${attrs} ${error ? `aria-invalid="true" aria-describedby="e-${name}"` : ''} />
    ${error ? `<p class="form-field__error" id="e-${name}">${escapeHtml(error)}</p>` : ''}
  </div>`;

const renderCustomer = (lines, errors = {}) => {
  const d = getDraft();
  return `${stepper('coordonnees')}
    <div class="checkout">
      <section class="checkout-main" aria-labelledby="step-title">
        <h2 class="checkout-main__title" id="step-title" tabindex="-1">Vos coordonnées</h2>
        <p class="checkout-main__intro">Les billets seront établis au nom indiqué. Les champs marqués d'un astérisque sont obligatoires.</p>
        ${Object.keys(errors).length ? `<div class="form-alert" role="alert">Merci de corriger les ${Object.keys(errors).length} champ(s) signalé(s).</div>` : ''}
        <form class="checkout-form" data-customer-form novalidate>
          <div class="form-grid">
            ${field('firstName', 'Prénom *', d.firstName, errors.firstName, 'autocomplete="given-name" required')}
            ${field('lastName', 'Nom *', d.lastName, errors.lastName, 'autocomplete="family-name" required')}
            ${field('email', 'Email *', d.email, errors.email, 'type="email" autocomplete="email" required')}
            ${field('emailConfirm', "Confirmation de l'email *", d.emailConfirm, errors.emailConfirm, 'type="email" autocomplete="off" required')}
            ${field('phone', 'Téléphone (optionnel)', d.phone, errors.phone, 'type="tel" autocomplete="tel"')}
            ${field('zip', 'Code postal (optionnel)', d.zip, errors.zip, 'inputmode="numeric" autocomplete="postal-code" maxlength="5"')}
          </div>
          <label class="form-check${errors.cgv ? ' has-error' : ''}">
            <input type="checkbox" name="cgv" ${d.cgv ? 'checked' : ''} ${errors.cgv ? 'aria-invalid="true" aria-describedby="e-cgv"' : ''} />
            <span>J'accepte les <a href="mentions-legales.html#cgv" target="_blank" rel="noopener">conditions générales de vente</a>. *</span>
          </label>
          ${errors.cgv ? `<p class="form-field__error" id="e-cgv">${errors.cgv}</p>` : ''}
          <label class="form-check">
            <input type="checkbox" name="newsletter" ${d.newsletter ? 'checked' : ''} />
            <span>Je souhaite recevoir la newsletter de Destination EtherBay.</span>
          </label>
          <p class="form-legal">Vos données servent uniquement à établir vos billets. Sur ce site de démonstration, elles restent enregistrées dans votre navigateur et ne sont envoyées à aucun serveur.</p>
          <div class="checkout-actions">
            <a class="btn btn--outline" href="#panier">Retour au panier</a>
            <button class="btn" type="submit">Continuer vers le paiement ${ICONS.arrow}</button>
          </div>
        </form>
      </section>
      ${summary(lines)}
    </div>`;
};

const renderPayment = (lines) => {
  const d = getDraft();
  const { amount } = cartTotals(lines);
  return `${stepper('paiement')}
    <div class="checkout">
      <section class="checkout-main" aria-labelledby="step-title">
        <h2 class="checkout-main__title" id="step-title" tabindex="-1">Paiement</h2>
        <div class="demo-banner" role="note">
          <strong>Mode démonstration</strong>
          <p>Ce site est un projet pédagogique. Aucun paiement n'est demandé ni encaissé, et aucune coordonnée bancaire n'est collectée. La confirmation génère des billets fictifs.</p>
        </div>
        <div class="payment-recap">
          <h3>Titulaire des billets</h3>
          <p>${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)}<br />${escapeHtml(d.email)}${d.phone ? `<br />${escapeHtml(d.phone)}` : ''}</p>
          <a href="#coordonnees">Modifier</a>
        </div>
        <fieldset class="payment-methods">
          <legend>Mode de paiement</legend>
          <label class="payment-method is-selected">
            <input type="radio" name="method" value="demo" checked />
            <span><strong>Paiement simulé</strong><small>Valide la commande sans transaction.</small></span>
          </label>
          <label class="payment-method is-disabled">
            <input type="radio" name="method" value="card" disabled />
            <span><strong>Carte bancaire</strong><small>Indisponible sur le site de démonstration.</small></span>
          </label>
        </fieldset>
        <div class="checkout-actions">
          <a class="btn btn--outline" href="#coordonnees">Retour</a>
          <button class="btn" type="button" data-pay>Confirmer la commande · ${euro(amount)} ${ICONS.arrow}</button>
        </div>
        <p class="form-legal">En confirmant, vous acceptez les conditions générales de vente. Montant affiché à titre indicatif.</p>
      </section>
      ${summary(lines)}
    </div>`;
};

const renderConfirmation = (order) => `
  ${stepper('confirmation')}
  <section class="confirmation" aria-labelledby="step-title">
    <div class="confirmation__head">
      <p class="eyebrow">Commande confirmée</p>
      <h2 class="confirmation__title" id="step-title" tabindex="-1">Merci ${escapeHtml(order.customer.firstName)} !</h2>
      <p>Votre commande <strong>${order.number}</strong> du ${formatLongDate(order.date)} est confirmée : ${order.tickets.length} billet${order.tickets.length > 1 ? 's' : ''} pour un total de <strong>${euro(order.total)}</strong>.</p>
      <p class="confirmation__demo">Démonstration : aucun paiement n'a été encaissé et aucun email n'a été envoyé à ${escapeHtml(order.customer.email)}.</p>
      <div class="btn-row">
        <button class="btn" type="button" data-print>Imprimer mes billets ${ICONS.arrow}</button>
        <a class="btn btn--outline" href="index.html">Retour à l'accueil</a>
      </div>
    </div>
    <ul class="e-tickets">
      ${order.tickets.map((t) => `
        <li class="e-ticket">
          <div class="e-ticket__main">
            <p class="e-ticket__brand">Destination EtherBay · Billet électronique</p>
            <h3 class="e-ticket__title">${escapeHtml(t.title)}</h3>
            <dl class="e-ticket__info">
              <div><dt>Date</dt><dd>${formatLongDate(t.date)}</dd></div>
              <div><dt>Titulaire</dt><dd>${escapeHtml(order.customer.firstName)} ${escapeHtml(order.customer.lastName)}</dd></div>
              <div><dt>Tarif</dt><dd>${euro(t.amount)}</dd></div>
              <div><dt>N° de billet</dt><dd>${t.code}</dd></div>
            </dl>
          </div>
        </li>`).join('')}
    </ul>
  </section>`;

const placeOrder = () => {
  const lines = cartLines();
  const d = getDraft();
  const number = createOrderNumber();
  let n = 0;
  const tickets = lines.flatMap((l) =>
    Array.from({ length: l.qty }, () => {
      n += 1;
      return { code: `${number}-${String(n).padStart(2, '0')}`, ticketId: l.ticket.id, title: l.ticket.title, date: l.date, amount: l.ticket.amount };
    })
  );
  const order = saveOrder({
    number,
    date: new Date().toISOString().slice(0, 10),
    customer: { firstName: d.firstName.trim(), lastName: d.lastName.trim(), email: d.email.trim() },
    total: cartTotals(lines).amount,
    tickets,
  });
  if (d.newsletter) {
    const list = storage.get('etherbay.newsletter', []);
    if (!list.includes(order.customer.email)) storage.set('etherbay.newsletter', [...list, order.customer.email]);
  }
  clearCart();
  storage.set(DRAFT_KEY, {});
  return order;
};

const render = () => {
  const step = window.location.hash.slice(1) || 'panier';
  const lines = cartLines();
  const draftValid = Object.keys(validateCustomer(getDraft())).length === 0;
  let html;

  if (step === 'confirmation' && confirmedOrder) html = renderConfirmation(confirmedOrder);
  else if (!lines.length) html = renderCart(lines);
  else if (step === 'coordonnees') html = renderCustomer(lines);
  else if (step === 'paiement' && draftValid) html = renderPayment(lines);
  else if (step === 'paiement') {
    window.location.replace('#coordonnees');
    return;
  } else html = renderCart(lines);

  root().innerHTML = html;
  const title = $('#step-title');
  if (title && document.activeElement !== document.body) title.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
};

export default function initCommande() {
  const q = params();
  if (q.get('ajout')) {
    addToCart(q.get('ajout'), 1);
    window.history.replaceState(null, '', 'commande.html#panier');
  }
  if (q.get('commande')) {
    confirmedOrder = findOrder(q.get('commande'));
    if (confirmedOrder) window.history.replaceState(null, '', `commande.html?commande=${confirmedOrder.number}#confirmation`);
  }

  root().addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-line-qty]');
    if (qtyBtn) {
      const id = qtyBtn.dataset.id;
      const current = cartLines().find((l) => l.ticket.id === id)?.qty || 0;
      setQuantity(id, current + Number(qtyBtn.dataset.lineQty));
      render();
      return;
    }
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      setQuantity(remove.dataset.remove, 0);
      render();
      return;
    }
    if (e.target.closest('[data-print]')) {
      window.print();
      return;
    }
    const pay = e.target.closest('[data-pay]');
    if (pay) {
      pay.disabled = true;
      pay.setAttribute('aria-busy', 'true');
      pay.textContent = 'Validation en cours…';
      window.setTimeout(() => {
        confirmedOrder = placeOrder();
        window.history.replaceState(null, '', `commande.html?commande=${confirmedOrder.number}#confirmation`);
        render();
      }, 1200);
    }
  });

  root().addEventListener('change', (e) => {
    const input = e.target.closest('[data-date]');
    if (!input) return;
    if (input.value && input.value >= input.min && input.value <= input.max) setDate(input.dataset.date, input.value);
    else input.value = cartLines().find((l) => l.ticket.id === input.dataset.date)?.date || input.min;
    render();
  });

  root().addEventListener('input', (e) => {
    const form = e.target.closest('[data-customer-form]');
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    storage.set(DRAFT_KEY, { ...data, cgv: Boolean(data.cgv), newsletter: Boolean(data.newsletter) });
  });

  root().addEventListener('submit', (e) => {
    const form = e.target.closest('[data-customer-form]');
    if (!form) return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const customer = { ...data, cgv: Boolean(data.cgv), newsletter: Boolean(data.newsletter) };
    storage.set(DRAFT_KEY, customer);
    const errors = validateCustomer(customer);
    if (Object.keys(errors).length) {
      root().innerHTML = renderCustomer(cartLines(), errors);
      $$('[aria-invalid="true"]', root())[0]?.focus();
      return;
    }
    window.location.hash = 'paiement';
  });

  window.addEventListener('hashchange', render);
  render();
}
