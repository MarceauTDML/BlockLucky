import { ICONS } from './icons.js';
import { $, storage, toast } from './utils.js';

const KEY = 'etherbay.cookie-consent';

const template = () => `
  <div class="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title" hidden>
    <div class="cookie-banner__box">
      <h2 class="cookie-banner__title" id="cookie-title">Nous respectons votre vie privée.</h2>
      <p class="cookie-banner__text">Ce site de démonstration n'utilise aucun cookie publicitaire. Nous enregistrons uniquement vos favoris et vos préférences dans votre navigateur. En cliquant sur « Tout accepter », vous autorisez la mesure d'audience anonyme de l'Office de Tourisme.</p>
      <div class="cookie-banner__prefs" data-cookie-prefs hidden>
        <label>Cookies essentiels (favoris, panier) <input type="checkbox" checked disabled /></label>
        <label>Mesure d'audience anonyme <input type="checkbox" data-cookie-audience /></label>
      </div>
      <div class="cookie-banner__actions">
        <button class="btn btn--dark" type="button" data-cookie-custom>Personnaliser ${ICONS.arrow}</button>
        <button class="btn btn--outline" type="button" data-cookie-reject>Tout rejeter ${ICONS.arrow}</button>
        <button class="btn btn--wide" type="button" data-cookie-accept>Accepter tout ${ICONS.arrow}</button>
      </div>
    </div>
  </div>
  <button class="cookie-revisit" type="button" aria-label="Gérer mes cookies" data-cookie-revisit>${ICONS.cookie}</button>`;

export const initCookies = () => {
  document.body.insertAdjacentHTML('beforeend', template());
  const banner = $('.cookie-banner');
  const prefs = $('[data-cookie-prefs]');
  const audience = $('[data-cookie-audience]');
  const customBtn = $('[data-cookie-custom]');

  const open = () => {
    const saved = storage.get(KEY);
    audience.checked = Boolean(saved?.audience);
    banner.hidden = false;
    $('[data-cookie-accept]').focus();
  };

  const close = (choice, message) => {
    storage.set(KEY, { ...choice, date: new Date().toISOString() });
    banner.hidden = true;
    prefs.hidden = true;
    customBtn.innerHTML = `Personnaliser ${ICONS.arrow}`;
    toast(message);
  };

  $('[data-cookie-accept]').addEventListener('click', () => close({ audience: true }, 'Préférences enregistrées'));
  $('[data-cookie-reject]').addEventListener('click', () => close({ audience: false }, 'Cookies non essentiels refusés'));
  customBtn.addEventListener('click', () => {
    if (prefs.hidden) {
      prefs.hidden = false;
      customBtn.innerHTML = `Enregistrer ${ICONS.arrow}`;
      return;
    }
    close({ audience: audience.checked }, 'Préférences enregistrées');
  });
  $('[data-cookie-revisit]').addEventListener('click', open);

  if (!storage.get(KEY)) open();
};
