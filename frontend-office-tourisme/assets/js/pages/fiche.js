import { SITE } from '../data/site.js';
import { findEvent, EVENTS } from '../data/events.js';
import { ALL_PLACES, findPlace } from '../data/places.js';
import { findTicketForEvent } from '../data/content.js';
import { euro } from '../modules/cart.js';
import { eventCard, placeCard } from '../modules/cards.js';
import { ICONS } from '../modules/icons.js';
import { $, escapeHtml, formatRange, params, visualSrc } from '../modules/utils.js';

const row = (label, value) => (value ? `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>` : '');

const renderPlace = (p) => {
  const back = { manger: ['Manger à EtherBay', 'manger.html'], dormir: ['Dormir à EtherBay', 'dormir.html'], sortir: ['Sortir', 'sortir.html'], decouvrir: ['Découvrir EtherBay', 'decouvrir.html'] }[p.universe];
  return {
    title: p.name,
    crumb: back,
    html: `
      <div class="fiche-hero">
        <div class="visual fiche-hero__visual"><img src="${visualSrc(p.visual)}" alt="" /></div>
        <div>
          <p class="fiche-hero__type">${escapeHtml(p.type)} · ${escapeHtml(p.district)}</p>
          <h1 class="fiche-hero__title">${escapeHtml(p.name)}</h1>
          <p>${escapeHtml(p.description)}</p>
          ${p.partnerOffer ? `<div class="fiche-offer"><strong>Offre EtherPoints</strong>${escapeHtml(p.partnerOffer)}</div>` : ''}
          <dl class="fiche-info">
            ${row('Adresse', `${escapeHtml(p.address)}, ${p.zip} ${p.city}`)}
            ${row('Tarifs', escapeHtml(p.price))}
            ${row('Ouverture', p.days.length ? escapeHtml(p.days.join(', ')) : '')}
            ${row('Services', escapeHtml([...p.access, ...p.public].join(' · ')))}
            ${row('Labels', p.labels.length ? escapeHtml(p.labels.join(' · ')) : '')}
          </dl>
          <div class="fiche-hero__actions">
            <button class="btn" type="button" data-fav="place:${p.id}" aria-pressed="false">${ICONS.heart} Ajouter aux favoris</button>
            <a class="btn btn--outline" href="tel:+33298002026">Contacter ${ICONS.arrow}</a>
          </div>
        </div>
      </div>`,
    related: ALL_PLACES.filter((x) => x.universe === p.universe && x.id !== p.id).slice(0, 4).map(placeCard),
    map: `${p.address}, ${p.city}`,
  };
};

const eventAction = (e) => {
  if (e.lottery) return `<a class="btn" href="${SITE.lotteryAppUrl}" target="_blank" rel="noopener">Accéder à la loterie ${ICONS.arrow}</a>`;
  const ticket = findTicketForEvent(e.id);
  if (ticket) return `<a class="btn" href="commande.html?ajout=${ticket.id}">Réserver · ${euro(ticket.amount)} ${ICONS.arrow}</a>`;
  return `<button class="btn" type="button" data-ics="${e.id}">Ajouter à mon agenda ${ICONS.arrow}</button>`;
};

const icsDate = (iso, addDays = 0) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + addDays);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const icsText = (value) => String(value).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

const downloadIcs = (e) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Destination EtherBay//Office de Tourisme//FR',
    'BEGIN:VEVENT',
    `UID:${e.id}@tourisme-etherbay.fr`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${icsDate(e.start)}`,
    `DTEND;VALUE=DATE:${icsDate(e.end, 1)}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(`${e.place}, EtherBay`)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const renderEvent = (e) => ({
  title: e.title,
  crumb: ['Sortir', 'sortir.html'],
  html: `
    <div class="fiche-hero">
      <div class="visual fiche-hero__visual"><img src="${visualSrc(e.visual)}" alt="" /></div>
      <div>
        <p class="fiche-hero__type">${escapeHtml(e.category)} · ${formatRange(e.start, e.end)}</p>
        <h1 class="fiche-hero__title">${escapeHtml(e.title)}</h1>
        <p>${escapeHtml(e.description)}</p>
        ${e.lottery ? `<div class="fiche-offer"><strong>Pilote pédagogique</strong>Participation réservée aux personnes majeures, avec des ethers fictifs sans valeur monétaire. Chaque ticket est vérifiable sur la blockchain.</div>` : ''}
        <dl class="fiche-info">
          ${row('Dates', formatRange(e.start, e.end))}
          ${row('Lieu', escapeHtml(e.place))}
          ${row('Tarif', escapeHtml(findTicketForEvent(e.id) ? `${euro(findTicketForEvent(e.id).amount)} en billetterie en ligne` : e.price || 'Voir le site de l’organisateur'))}
        </dl>
        <div class="fiche-hero__actions">
          ${eventAction(e)}
          <button class="btn btn--outline" type="button" data-fav="event:${e.id}" aria-pressed="false">${ICONS.heart} Favoris</button>
        </div>
      </div>
    </div>`,
  related: EVENTS.filter((x) => x.id !== e.id && x.category === e.category).concat(EVENTS.filter((x) => x.id !== e.id && x.category !== e.category)).slice(0, 4).map(eventCard),
  map: e.place,
});

export default function initFiche() {
  const q = params();
  const place = q.get('id') ? findPlace(q.get('id')) : null;
  const event = q.get('event') ? findEvent(q.get('event')) : null;
  const root = $('[data-fiche]');

  if (!place && !event) {
    root.innerHTML = `<div class="error-page"><p class="error-page__code">404</p><h1>Fiche introuvable</h1><p>Cette offre n'existe pas ou n'est plus disponible.</p><a class="btn" href="index.html">Retour à l'accueil ${ICONS.arrow}</a></div>`;
    return;
  }

  const view = place ? renderPlace(place) : renderEvent(event);
  document.title = `${view.title} - ${SITE.fullName}`;
  $('[data-crumb]').innerHTML = `<a href="index.html">Accueil</a><span aria-hidden="true">»</span><a href="${view.crumb[1]}">${escapeHtml(view.crumb[0])}</a><span aria-hidden="true">»</span>${escapeHtml(view.title)}`;
  root.innerHTML = view.html;
  $('[data-map-label]').textContent = view.map;
  $('[data-related]').innerHTML = view.related.map((c) => `<div>${c}</div>`).join('');
  $('[data-map-pin]').innerHTML = ICONS.pin;
  if (event) {
    root.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-ics]')) downloadIcs(event);
    });
  }
}
