import { SOCIALS } from '../data/site.js';
import { $, params } from '../modules/utils.js';

export default function initBientot() {
  const key = params().get('reseau');
  const network = SOCIALS.find((s) => s.key === key);
  if (!network) return;
  $('[data-soon-network]').textContent = network.label;
  $('[data-soon-text]').textContent = `Le compte ${network.label} officiel de Destination EtherBay ouvrira avec le lancement de la campagne de la Grande Loterie citoyenne. En attendant, suivez l'actualité de la baie grâce à notre newsletter.`;
  document.title = `${network.label} : bientôt disponible - Destination EtherBay`;
}
