import { $, $$ } from './utils.js';

const setup = (slider) => {
  if (slider.dataset.sliderReady) return;
  slider.dataset.sliderReady = 'true';
  const track = $('.slider__track', slider);
  const prev = $('[data-slider-prev]', slider);
  const next = $('[data-slider-next]', slider);
  if (!track) return;

  const step = () => {
    const first = track.firstElementChild;
    if (!first) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  };

  const update = () => {
    if (!prev || !next) return;
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  };

  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  update();
  slider.refreshSlider = () => {
    track.scrollTo({ left: 0 });
    update();
  };
};

export const initSliders = (root = document) => $$('[data-slider]', root).forEach(setup);
