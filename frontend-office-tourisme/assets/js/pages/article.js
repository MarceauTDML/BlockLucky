import { SITE } from '../data/site.js';
import { ARTICLES, findArticle } from '../data/content.js';
import { postCard } from '../modules/cards.js';
import { ICONS } from '../modules/icons.js';
import { $, escapeHtml, formatLongDate, params, visualSrc } from '../modules/utils.js';

export default function initArticle() {
  const article = findArticle(params().get('id')) || ARTICLES[0];
  document.title = `${article.title} - ${SITE.fullName}`;
  $('[data-crumb]').innerHTML = `<a href="index.html">Accueil</a><span aria-hidden="true">»</span><a href="decouvrir.html">Découvrir EtherBay</a><span aria-hidden="true">»</span>${escapeHtml(article.title)}`;

  const cta = article.cta
    ? `<div class="article__cta"><a class="btn" href="${article.cta.external === 'lottery' ? SITE.lotteryAppUrl : article.cta.href}"${article.cta.external ? ' target="_blank" rel="noopener"' : ''}>${escapeHtml(article.cta.label)} ${ICONS.arrow}</a></div>`
    : '';

  $('[data-article]').innerHTML = `
    <span class="article__date">Publié le ${formatLongDate(article.date)}</span>
    <h1 class="page-hero__title text-center">${escapeHtml(article.title)}</h1>
    <div class="visual article__visual"><img src="${visualSrc(article.visual)}" alt="" /></div>
    <div class="article__body">${article.body.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div>
    ${cta}`;

  $('[data-posts]').innerHTML = ARTICLES.filter((a) => a.id !== article.id)
    .map((a) => `<div>${postCard(a)}</div>`)
    .join('');
}
