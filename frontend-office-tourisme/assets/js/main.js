import { renderLayout } from './modules/layout.js';
import { initFavorites, syncHearts } from './modules/favorites.js';
import { initSliders } from './modules/slider.js';
import { initCookies } from './modules/cookies.js';
import { initNewsletter } from './modules/newsletter.js';
import { updateCartCount } from './modules/cart.js';
import { $$ } from './modules/utils.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  decouvrir: () => import('./pages/decouvrir.js'),
  sortir: () => import('./pages/sortir.js'),
  manger: () => import('./pages/listing.js'),
  dormir: () => import('./pages/listing.js'),
  fiche: () => import('./pages/fiche.js'),
  article: () => import('./pages/article.js'),
  favoris: () => import('./pages/favoris.js'),
  billetterie: () => import('./pages/billetterie.js'),
  commande: () => import('./pages/commande.js'),
};

const initReveal = () => {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px' }
  );
  items.forEach((el) => io.observe(el));
};

const boot = async () => {
  const { page = '', nav = '', overlay } = document.body.dataset;
  renderLayout({ current: nav || page, overlay: overlay === 'true' });

  const loader = PAGES[page];
  if (loader) {
    const mod = await loader();
    await mod.default?.(page);
  }

  initSliders();
  initFavorites();
  syncHearts();
  updateCartCount();
  initNewsletter();
  initCookies();
  initReveal();
};

boot();
