import { $$, storage, toast } from './utils.js';

const KEY = 'etherbay.favorites';

export const getFavorites = () => storage.get(KEY, []);

export const isFavorite = (ref) => getFavorites().includes(ref);

const save = (list) => {
  storage.set(KEY, list);
  updateFavoriteCount();
  document.dispatchEvent(new CustomEvent('favorites:change', { detail: list }));
};

export const toggleFavorite = (ref) => {
  const list = getFavorites();
  const next = list.includes(ref) ? list.filter((r) => r !== ref) : [...list, ref];
  save(next);
  return next.includes(ref);
};

export const updateFavoriteCount = () => {
  const count = getFavorites().length;
  $$('[data-fav-count]').forEach((el) => {
    el.textContent = String(count);
    el.hidden = count === 0;
  });
};

export const syncHearts = (root = document) => {
  $$('[data-fav]', root).forEach((btn) => {
    const active = isFavorite(btn.dataset.fav);
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
  });
};

export const initFavorites = () => {
  updateFavoriteCount();
  syncHearts();
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    const active = toggleFavorite(btn.dataset.fav);
    $$(`[data-fav="${btn.dataset.fav}"]`).forEach((b) => {
      b.setAttribute('aria-pressed', String(active));
      b.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
    });
    toast(active ? 'Ajouté à vos favoris' : 'Retiré de vos favoris');
  });
};
