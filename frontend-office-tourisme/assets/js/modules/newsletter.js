import { $, storage } from './utils.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const initNewsletter = () => {
  const form = $('[data-newsletter]');
  if (!form) return;
  const feedback = $('[data-newsletter-feedback]', form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const consent = form.elements.consent.checked;
    feedback.className = 'newsletter__feedback';

    if (!EMAIL.test(email)) {
      feedback.textContent = 'Veuillez saisir une adresse email valide.';
      feedback.classList.add('is-error');
      form.elements.email.focus();
      return;
    }
    if (!consent) {
      feedback.textContent = 'Merci de cocher la case de consentement.';
      feedback.classList.add('is-error');
      return;
    }

    const list = storage.get('etherbay.newsletter', []);
    if (!list.includes(email)) storage.set('etherbay.newsletter', [...list, email]);
    feedback.textContent = 'Merci ! Votre inscription est confirmée. À très vite dans la baie.';
    feedback.classList.add('is-success');
    form.reset();
  });
};
