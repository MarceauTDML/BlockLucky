import { FOOTER_BOTTOM, FOOTER_LINKS, FOOTER_TOP, LABELS, MAIN_NAV, OPENING_HOURS, PRE_HEADER, SITE, SOCIALS } from '../data/site.js';
import { BRAND_WAVE, ICONS } from './icons.js';
import { $, escapeHtml, toast } from './utils.js';

const brand = (extraClass = '') => `
  <a class="brand ${extraClass}" href="index.html" aria-label="${escapeHtml(SITE.fullName)}, retour à l'accueil">
    <span class="brand__word">ETHER${BRAND_WAVE}BAY</span>
    <span class="brand__sub">DESTINATION</span>
  </a>`;

const preheader = () => `
  <nav class="preheader" aria-label="Accès rapides">
    <div class="container container--wide preheader__inner">
      ${PRE_HEADER.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('')}
    </div>
  </nav>`;

const header = (current) => `
  <div class="container container--wide site-header__inner">
    ${brand()}
    <nav class="main-nav" aria-label="Navigation principale">
      ${MAIN_NAV.map((l) => `<a href="${l.href}"${l.key === current ? ' aria-current="page"' : ''}>${escapeHtml(l.label)}</a>`).join('')}
    </nav>
    <div class="header-actions">
      <a class="btn btn--sm" href="billetterie.html"${current === 'billetterie' ? ' aria-current="page"' : ''}>Billetterie ${ICONS.arrow}</a>
      <a class="icon-btn" href="commande.html" aria-label="Panier">
        ${ICONS.bag}
        <span class="icon-btn__count" data-cart-count hidden>0</span>
      </a>
      <a class="icon-btn" href="favoris.html" aria-label="Favoris">
        ${ICONS.heart}
        <span class="icon-btn__count" data-fav-count hidden>0</span>
      </a>
      <button class="icon-btn burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mobile-menu" data-menu-open>${ICONS.burger}</button>
    </div>
  </div>`;

const mobileMenu = () => `
  <div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
    <div class="mobile-menu__top">
      ${brand()}
      <button class="icon-btn" type="button" aria-label="Fermer le menu" data-menu-close>${ICONS.close}</button>
    </div>
    <nav class="mobile-menu__nav" aria-label="Navigation mobile">
      ${MAIN_NAV.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('')}
      <a href="billetterie.html">Billetterie</a>
      <a href="favoris.html">Favoris</a>
    </nav>
    <div class="mobile-menu__secondary">
      ${PRE_HEADER.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('')}
    </div>
  </div>`;

const footer = () => `
  <section class="newsletter" aria-labelledby="newsletter-title">
    <div class="container">
      <div class="newsletter__box">
        <div>
          <h2 class="newsletter__title" id="newsletter-title">Inscrivez-vous à la newsletter !</h2>
          <p>Retrouvez chaque mois une sélection des meilleurs événements, nouveautés et bons plans à ne pas rater à EtherBay et dans sa baie.</p>
          <form class="newsletter__form" data-newsletter novalidate>
            <div class="newsletter__field">
              <label class="sr-only" for="newsletter-email">Votre email</label>
              <input id="newsletter-email" name="email" type="email" placeholder="Votre email" autocomplete="email" required />
            </div>
            <button class="btn" type="submit">S'abonner ${ICONS.arrow}</button>
            <label class="newsletter__consent">
              <input type="checkbox" name="consent" required />
              <span>J'accepte de recevoir la newsletter de ${escapeHtml(SITE.name)} et je peux me désinscrire à tout moment.</span>
            </label>
            <p class="newsletter__feedback" data-newsletter-feedback role="status" aria-live="polite"></p>
          </form>
          <p class="newsletter__legal">Les données récoltées seront utilisées à des fins d'information et de contact par ${escapeHtml(SITE.name)}. Vous pouvez faire valoir vos droits issus du Règlement Général sur la Protection des Données en vous adressant à notre délégué à la protection des données : ${escapeHtml(SITE.dpoEmail)} ou par voie postale : DPO, ${escapeHtml(SITE.name)}, ${escapeHtml(SITE.address)}.</p>
        </div>
        <ul class="socials" aria-label="Réseaux sociaux">
          ${SOCIALS.map((s) => `<li><a href="${s.href}" aria-label="${s.label}">${ICONS[s.key]}</a></li>`).join('')}
        </ul>
      </div>
    </div>
  </section>
  <nav class="footer-top" aria-label="Sites associés">
    <div class="container container--wide footer-top__inner">
      ${FOOTER_TOP.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join('')}
    </div>
  </nav>
  <div class="footer-main">
    <div class="container footer-main__grid">
      <div class="footer-col footer-col--bordered">
        ${brand()}
        <address class="footer-contact" style="font-style: normal">
          Office de Tourisme<br />${escapeHtml(SITE.address)}<br />
          <a href="tel:+33298002026">${escapeHtml(SITE.phone)}</a><br />
          <small>${escapeHtml(SITE.phoneNote)}</small>
        </address>
        <div class="footer-hours">
          ${OPENING_HOURS.map((h) => `<strong>${escapeHtml(h.title)}</strong>${h.lines.map((l) => escapeHtml(l)).join('<br />')}`).join('')}
        </div>
      </div>
      <div class="footer-col footer-col--bordered">
        <ul class="footer-links">
          ${FOOTER_LINKS.map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`).join('')}
          <li><a class="footer-eco" href="mentions-legales.html#eco">${ICONS.leaf}Tourisme éco-responsable</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <ul class="footer-labels" aria-label="Labels de la destination">
          ${LABELS.map((l) => `<li class="label-badge" title="${escapeHtml(l.title)}">${escapeHtml(l.short)}</li>`).join('')}
        </ul>
        <div class="lang-select">
          <label class="sr-only" for="lang">Langue</label>
          <select id="lang" data-lang-select aria-describedby="lang-note">
            <option value="fr" selected>Français</option>
            <option value="en">English</option>
            <option value="br">Brezhoneg</option>
          </select>
        </div>
        <p class="lang-note" id="lang-note" data-lang-note hidden></p>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container footer-bottom__inner">
      <ul>${FOOTER_BOTTOM.map((l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`).join('')}</ul>
      <p class="footer-bottom__credit">Réalisé avec passion pour la Ville d'EtherBay | Projet BlockLucky</p>
    </div>
  </div>`;

const initStickyHeader = (headerEl) => {
  const threshold = () => (headerEl.classList.contains('site-header--overlay') ? 520 : 240);
  const placeholder = document.createElement('div');
  placeholder.style.height = '0px';
  headerEl.after(placeholder);
  let sticky = false;
  const update = () => {
    const shouldStick = window.scrollY > threshold();
    if (shouldStick === sticky) return;
    sticky = shouldStick;
    headerEl.classList.toggle('is-sticky', sticky);
    if (!headerEl.classList.contains('site-header--overlay')) {
      placeholder.style.height = sticky ? `${headerEl.offsetHeight}px` : '0px';
    }
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
};

const initMobileMenu = () => {
  const menu = $('#mobile-menu');
  const openBtn = $('[data-menu-open]');
  const closeBtn = $('[data-menu-close]');
  if (!menu || !openBtn || !closeBtn) return;
  const open = () => {
    menu.hidden = false;
    void menu.offsetWidth;
    menu.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };
  const close = () => {
    menu.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      menu.hidden = true;
    }, 350);
    openBtn.focus();
  };
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
};

const LANGUAGE_NOTES = {
  en: 'English translation coming soon. The site is currently available in French only.',
  br: 'Troidigezh e brezhoneg a-benn nebeut. Traduction en breton à venir.',
};

const initLanguageSelect = () => {
  const select = $('[data-lang-select]');
  const note = $('[data-lang-note]');
  if (!select || !note) return;
  select.addEventListener('change', () => {
    const message = LANGUAGE_NOTES[select.value];
    if (!message) return;
    note.textContent = message;
    note.hidden = false;
    toast('Traduction à venir');
    select.value = 'fr';
  });
};

const initBackToTop = () => {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Revenir en haut de page');
  btn.innerHTML = ICONS.up;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);
  const update = () => btn.classList.toggle('is-visible', window.scrollY > 900);
  window.addEventListener('scroll', update, { passive: true });
  update();
};

export const renderLayout = ({ current, overlay }) => {
  const pre = $('#preheader');
  if (pre) pre.outerHTML = preheader();

  const headerEl = $('#site-header');
  if (headerEl) {
    headerEl.className = `site-header${overlay ? ' site-header--overlay' : ''}`;
    headerEl.innerHTML = header(current);
    headerEl.insertAdjacentHTML('afterend', mobileMenu());
    initStickyHeader(headerEl);
    initMobileMenu();
  }

  const footerEl = $('#site-footer');
  if (footerEl) {
    footerEl.innerHTML = footer();
    initLanguageSelect();
  }

  initBackToTop();
};
