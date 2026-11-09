import { ICONS } from './icons.js';
import { escapeHtml, formatLongDate, formatRange, visualSrc } from './utils.js';

const heart = (ref) =>
  `<button class="heart" type="button" data-fav="${ref}" aria-pressed="false" aria-label="Ajouter aux favoris">${ICONS.heart}</button>`;

const img = (visual, alt = '') => `<img src="${visualSrc(visual)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`;

export const tileCard = ({ title, tag, href, visual }, compact = false) => `
  <a class="tile${compact ? ' tile--compact' : ''}" href="${href}">
    ${img(visual)}
    <span class="tile__body">
      ${tag ? `<span class="tile__tag">${escapeHtml(tag)}</span>` : ''}
      <span class="tile__title h3">${escapeHtml(title)}</span>
    </span>
  </a>`;

export const eventCard = (event) => `
  <article class="event-card">
    <div class="event-card__media">
      <span class="event-card__date">${formatRange(event.start, event.end)}</span>
      ${img(event.visual)}
      ${heart(`event:${event.id}`)}
    </div>
    <div class="event-card__body">
      <p class="event-card__cat">${escapeHtml(event.category)}</p>
      <h3 class="event-card__title"><a href="fiche.html?event=${event.id}">${escapeHtml(event.title)}</a></h3>
      <p class="price-tag">${escapeHtml(event.price || 'En savoir plus')}</p>
    </div>
  </article>`;

export const placeCard = (place) => `
  <article class="event-card">
    <div class="event-card__media">
      ${img(place.visual)}
      ${heart(`place:${place.id}`)}
    </div>
    <div class="event-card__body">
      <p class="event-card__cat">${escapeHtml(place.type)}</p>
      <h3 class="event-card__title"><a href="fiche.html?id=${place.id}">${escapeHtml(place.name)}</a></h3>
      <p class="price-tag">En savoir plus</p>
    </div>
  </article>`;

export const postCard = (article) => `
  <article class="post-card">
    <p class="post-card__date">Publié le ${formatLongDate(article.date)}</p>
    <h3 class="post-card__title"><a href="article.html?id=${article.id}">${escapeHtml(article.title)}</a></h3>
    <p class="post-card__excerpt">${escapeHtml(article.excerpt)}</p>
  </article>`;

export const sliderControls = () => `
  <div class="slider__nav">
    <button class="slider__btn" type="button" data-slider-prev aria-label="Précédent">${ICONS.chevronLeft}</button>
    <button class="slider__btn" type="button" data-slider-next aria-label="Suivant">${ICONS.chevronRight}</button>
  </div>`;

export const btn = (label, href, variant = '') =>
  `<a class="btn${variant ? ` btn--${variant}` : ''}" href="${href}">${escapeHtml(label)} ${ICONS.arrow}</a>`;
