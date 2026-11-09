export const HERO = {
  title: 'Que faire à EtherBay en novembre ?',
  cta: { label: 'Idées de sorties', href: 'article.html?id=novembre-etherbay' },
  visual: 'hero-port',
};

export const NOUVEAUTE = {
  eyebrow: 'Nouveauté',
  title: 'La Grande Loterie citoyenne',
  paragraphs: [
    "Pour les fêtes de fin d'année, la Ville d'EtherBay lance sa première loterie pédagogique sur blockchain : chaque habitant majeur peut participer avec des ethers fictifs et suivre son ticket en toute transparence.",
    "Tirage public certifié le 19 décembre place de la Mairie, et des EtherPoints à échanger chez les commerçants partenaires de la ville.",
  ],
  cta: { label: 'Je participe', href: 'fiche.html?event=loterie-citoyenne' },
  visual: 'bandeau-loterie',
};

export const INCONTOURNABLES = [
  { tag: 'Événement', title: "Semaines de l'innovation : 30 entreprises ouvrent leurs portes", href: 'fiche.html?event=semaines-innovation', visual: 'semaines-innovation' },
  { tag: 'Festival Nuit des Marins', title: 'Le plus grand bal de chants de marins', href: 'fiche.html?event=nuit-des-marins', visual: 'nuit-des-marins' },
  { tag: 'Pratique', title: 'Les restaurants qui servent en continu', href: 'manger.html', visual: 'smart-comptoir' },
  { tag: 'Patrimoine', title: 'Monter au sommet du phare', href: 'fiche.html?id=phare-etherbay', visual: 'phare-etherbay' },
  { tag: 'Innovation', title: 'La Maison de la Blockchain', href: 'fiche.html?id=maison-blockchain', visual: 'maison-blockchain' },
  { tag: 'Nature', title: 'Le parc des Embruns en hiver', href: 'fiche.html?id=parc-des-embruns', visual: 'parc-des-embruns' },
];

export const DECOUVRIR_THEMES = [
  { title: 'Culture', visual: 'musee-beaux-arts', href: 'article.html?id=il-etait-une-fois-la-criee' },
  { title: 'Gastronomie', visual: 'halles-presquile', href: 'manger.html' },
  { title: 'Histoire', visual: 'theme-histoire', href: 'fiche.html?id=phare-etherbay' },
  { title: 'Insolite', visual: 'visite-legendes', href: 'fiche.html?event=visite-legendes' },
  { title: 'Nature', visual: 'parc-des-embruns', href: 'fiche.html?id=parc-des-embruns' },
  { title: 'Rando & vélo', visual: 'theme-velo', href: 'infos-pratiques.html#venir' },
  { title: 'Shopping', visual: 'theme-shopping', href: 'article.html?id=brocantes-du-mole' },
  { title: 'Sortir', visual: 'nuit-des-marins', href: 'sortir.html' },
  { title: 'Sports', visual: 'theme-sports', href: 'fiche.html?event=foulees-du-phare' },
  { title: 'Innovation', visual: 'maison-blockchain', href: 'fiche.html?id=maison-blockchain' },
  { title: 'Week-end', visual: 'theme-weekend', href: 'article.html?id=novembre-etherbay' },
  { title: 'Actualités', visual: 'lumieres-du-port', href: 'article.html?id=lumieres-du-port-2026' },
];

export const BONS_PLANS_FOOD = [
  { title: 'Restaurants étoilés', visual: 'table-du-mole', filter: 'Gastronomique' },
  { title: 'Le top des crêperies', visual: 'creperie-du-phare', filter: 'Crêperie' },
  { title: "Où manger pas cher à EtherBay ?", visual: 'burger-des-docks', filter: 'Burger' },
  { title: 'Les meilleurs fruits de mer', visual: 'la-criee', filter: 'Dégustation fruits de mer' },
  { title: 'Brunchs du week-end', visual: 'bloc-et-brioche', filter: 'Brunch' },
  { title: 'Les partenaires EtherPoints', visual: 'loterie-citoyenne', filter: 'Partenaire EtherPoints' },
];

export const BONS_PLANS_DODO = [
  { title: 'Dormir face à la mer', visual: 'hotel-du-phare', filter: 'Hôtel 4 étoiles' },
  { title: "Les chambres d'hôtes de charme", visual: 'escale-marine', filter: "Chambres d'hôtes" },
  { title: 'Petits budgets', visual: 'auberge-le-quai', filter: 'Auberge de jeunesse' },
  { title: 'Séjours en plein air', visual: 'camping-de-la-baie', filter: 'Camping' },
];

export const ARTICLES = [
  {
    id: 'ressourceries-seconde-main',
    date: '2026-11-02',
    title: 'Ressourceries et seconde main',
    visual: 'article-ressourceries',
    excerpt: "Pourquoi acheter neuf quand on peut favoriser le réemploi ? Dans la baie, ressourceries et recycleries permettent de dénicher de bonnes affaires…",
    body: [
      "À EtherBay, la seconde main est devenue un réflexe. Trois ressourceries associatives récupèrent meubles, vêtements et objets du quotidien pour leur offrir une nouvelle vie.",
      "La plus grande, installée dans un ancien hangar des Docks, ouvre ses portes les mercredis et samedis. On y croise étudiants à la recherche d'un bureau, familles et chineurs avertis.",
      "Bon à savoir : plusieurs ressourceries acceptent désormais les EtherPoints de la Grande Loterie citoyenne en échange de bons d'achat.",
    ],
  },
  {
    id: 'brocantes-du-mole',
    date: '2026-10-29',
    title: 'Brocantes et antiquaires du Môle',
    visual: 'article-brocantes',
    excerpt: "Pour dénicher du mobilier de caractère, rien de tel que les brocanteurs du Môle. On a sélectionné pour vous quelques précieuses adresses…",
    body: [
      "Le premier dimanche du mois, le Môle se transforme en grand déballage : plus de 120 exposants installent leurs stands entre les bateaux.",
      "Toute l'année, une dizaine d'antiquaires tiennent boutique rue des Cordiers : cartes marines anciennes, instruments de navigation et faïences de la baie.",
    ],
  },
  {
    id: 'il-etait-une-fois-la-criee',
    date: '2026-10-22',
    title: 'Il était une fois… la salle de la Criée',
    visual: 'article-criee',
    excerpt: "Avant d'être la scène mythique des musiques actuelles, la Criée accueillait chaque matin la vente du poisson. Retour sur l'histoire d'un lieu…",
    body: [
      "Construite en 1902, la halle aux poissons voyait défiler chaque matin mareyeurs et poissonniers. Après le déménagement de la vente en 1987, le bâtiment est resté vide plus de dix ans.",
      "En 1999, un collectif de musiciens obtient l'autorisation d'y organiser un premier concert. Vingt-cinq ans plus tard, la salle accueille 200 dates par an.",
    ],
  },
  {
    id: 'novembre-etherbay',
    date: '2026-10-20',
    title: 'Que faire à EtherBay en novembre ?',
    visual: 'article-novembre',
    excerpt: "En novembre, on écoute du jazz sur le port, on chante avec la Nuit des Marins et on découvre la blockchain à la Maison du même nom. Il y a…",
    body: [
      "Novembre ne rime pas avec grisaille à EtherBay. Le festival Jazz à la Baie investit les bars du port, tandis que la Nuit des Marins réunit des milliers de chanteurs à la Salle de la Criée.",
      "Les curieux pousseront la porte de la Maison de la Blockchain pour l'exposition Code & Cité, idéale pour comprendre la Grande Loterie citoyenne avant son ouverture le 28 novembre.",
      "Et pour finir le mois, les Lumières du Port illuminent le parc des Embruns à partir du 27 novembre.",
    ],
  },
  {
    id: 'loterie-mode-emploi',
    date: '2026-10-19',
    title: 'La Grande Loterie citoyenne : mode d’emploi',
    visual: 'article-loterie',
    excerpt: "Ethers fictifs, ticket vérifiable, tirage certifié : tout ce qu'il faut savoir pour participer à la loterie pédagogique de la ville…",
    body: [
      "Pour sa première édition, la Ville d'EtherBay a choisi une loterie pédagogique : les tickets coûtent 0,01 ether fictif, une unité de test sans aucune valeur monétaire.",
      "Chaque participation est enregistrée sur une blockchain publique et peut être vérifiée par tous. Le gagnant est désigné le 19 décembre par un tirage aléatoire certifié, diffusé en direct.",
      "Chaque ticket rapporte aussi des EtherPoints, à échanger contre des avantages chez les commerçants partenaires comme la Boulangerie du Port ou le Cinéma Le Phare.",
    ],
    cta: { label: 'Accéder à la loterie', external: 'lottery' },
  },
  {
    id: 'lumieres-du-port-2026',
    date: '2026-10-15',
    title: 'Les Lumières du Port 2026',
    visual: 'article-lumieres',
    excerpt: "Le parcours lumineux revient avec une édition consacrée aux grands ports du monde. Dates, tarifs et conseils pour en profiter…",
    body: [
      "Du 27 novembre au 3 janvier, un parcours d'1,5 km relie le parc des Embruns aux quais à travers vingt installations lumineuses et sonores.",
      "Le parcours est accessible aux personnes à mobilité réduite. Les billets sont à réserver en ligne sur la billetterie de l'Office de Tourisme.",
    ],
  },
];

export const findArticle = (id) => ARTICLES.find((a) => a.id === id);

export const TICKET_GROUPS = [
  { id: 'pass', title: 'Pass et croisières' },
  { id: 'visites', title: 'Visites guidées' },
  { id: 'evenements', title: 'Événements' },
];

export const BILLETTERIE = [
  { id: 'pass-24', group: 'pass', title: 'Pass EtherBay 24h', amount: 25, visual: 'phare-etherbay', validUntil: '2027-06-30', description: 'Montée du phare, musées, transports en commun illimités et une visite guidée au choix pendant 24 heures.' },
  { id: 'pass-48', group: 'pass', title: 'Pass EtherBay 48h', amount: 39, visual: 'hero-port', validUntil: '2027-06-30', description: 'Toutes les entrées du Pass 24h, plus une croisière dans la baie et une dégustation à la Criée.' },
  { id: 'croisiere', group: 'pass', title: 'Croisière commentée dans la baie', amount: 18, visual: 'croisiere', validUntil: '2026-12-31', description: "1h de navigation au départ du quai des Voiliers, jusqu'au 31 décembre." },
  { id: 'visite-insolite', group: 'visites', title: 'EtherBay insolite, autour du Phare', amount: 6.5, visual: 'visite-insolite', event: 'visite-insolite', description: 'Visite guidée de 1h30 sur la colline du Phare.' },
  { id: 'visite-opera', group: 'visites', title: "L'Opéra d'EtherBay en coulisses", amount: 6.5, visual: 'visite-opera', event: 'visite-opera', description: 'Visite des coulisses et de la machinerie du théâtre.' },
  { id: 'visite-legendes', group: 'visites', title: 'EtherBay et ses légendes marines', amount: 6.5, visual: 'visite-legendes', event: 'visite-legendes', description: 'Visite à la lanterne sur les quais, à la tombée de la nuit.' },
  { id: 'lumieres-du-port', group: 'evenements', title: 'Les Lumières du Port', amount: 9, visual: 'lumieres-du-port', event: 'lumieres-du-port', description: 'Billet daté pour le parcours lumineux, créneaux de 30 minutes.' },
  { id: 'jazz-a-la-baie', group: 'evenements', title: 'Jazz à la Baie : soirée à la Criée', amount: 18, visual: 'jazz-a-la-baie', event: 'jazz-a-la-baie', description: 'Concert du soir à la Salle de la Criée, placement libre.' },
  { id: 'nuit-des-marins', group: 'evenements', title: 'La Nuit des Marins', amount: 15, visual: 'nuit-des-marins', event: 'nuit-des-marins', description: 'Entrée au bal de chants de marins de la Salle de la Criée.' },
  { id: 'cine-concert', group: 'evenements', title: 'Ciné-concert : les films muets de la mer', amount: 8.5, visual: 'cine-concert', event: 'cine-concert', description: 'Séance accompagnée en direct par l’orchestre de chambre de la baie.' },
  { id: 'foulees-du-phare', group: 'evenements', title: 'Les Foulées du Phare : dossard 10 km', amount: 12, visual: 'foulees-du-phare', event: 'foulees-du-phare', description: 'Inscription à la course de 10 km, t-shirt et ravitaillements inclus.' },
];

export const findTicket = (id) => BILLETTERIE.find((t) => t.id === id);

export const findTicketForEvent = (eventId) => BILLETTERIE.find((t) => t.event === eventId);
