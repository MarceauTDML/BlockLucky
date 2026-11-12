export type LegalDocId =
  'cgu' | 'reglement' | 'mentions' | 'confidentialite' | 'traceurs' | 'transparence';

export type LegalLanguage = 'FR' | 'EN';

export interface LegalItem {
  title: string;
  text: string;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  items?: LegalItem[];
}

export interface LegalDocument {
  eyebrow: string;
  title: string;
  summary: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_CONTACTS = {
  publisher: 'Ville d’EtherBay (collectivité fictive du scénario pédagogique)',
  publisherEn: 'City of EtherBay (fictional local authority of the educational scenario)',
  address: '1 place de la Mairie, 00000 EtherBay',
  phone: '00 00 00 00 00',
  support: 'support@etherbay.fr',
  dpo: 'dpo@etherbay.fr',
  director: 'Madame la Maire d’EtherBay',
  directorEn: 'The Mayor of EtherBay',
  host: 'Microsoft Ireland Operations Limited',
  hostAddress: 'One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irlande',
  hostAddressEn:
    'One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Ireland',
  demoDomain: 'etherbay.tech',
} as const;

export const LEGAL_VERSION: Record<LegalLanguage, string> = {
  FR: 'Version du 12 novembre 2026',
  EN: 'Version of 12 November 2026',
};

export const LEGAL_DOC_ORDER: LegalDocId[] = [
  'cgu',
  'reglement',
  'mentions',
  'confidentialite',
  'traceurs',
  'transparence',
];

const C = LEGAL_CONTACTS;

const cguFr: LegalDocument = {
  eyebrow: 'Conditions générales',
  title: 'Conditions générales d’utilisation',
  summary: 'Compte, portefeuille, offres et usages',
  intro:
    'Les présentes conditions encadrent l’utilisation du site BlockLucky et de son application mobile. BlockLucky est un prototype pédagogique de tirage au sort citoyen dans le cadre du scénario de la ville fictive d’EtherBay. Vous pouvez consulter les informations publiques sans compte. Un compte est nécessaire pour participer.',
  sections: [
    {
      heading: 'Éditeur et acceptation',
      paragraphs: [
        `Le service est édité par la ${C.publisher}, ${C.address}. En créant un compte, vous acceptez ces conditions et le règlement de participation. La politique de confidentialité vous informe sur l’usage de vos données.`,
      ],
    },
    {
      heading: 'Compte',
      paragraphs: [
        'La participation est réservée aux personnes âgées d’au moins 18 ans. Utilisez une adresse électronique à laquelle vous avez accès.',
        'Dans l’application mobile, vous créez votre compte avec une adresse électronique et un mot de passe, confirmés par un code reçu par email, ou avec votre compte Google. Sur le site web, vous confirmez votre majorité puis vous vous connectez avec un code reçu par email ou avec Google. Les codes sont valables 10 minutes.',
        `Gardez vos codes et votre mot de passe confidentiels. Vous pouvez activer la double authentification depuis la rubrique Sécurité. Signalez tout accès suspect à ${C.support}. Les espaces commerçant et Mairie sont réservés aux personnes habilitées.`,
      ],
    },
    {
      heading: 'Vérification de l’âge',
      paragraphs: [
        'Avant de prendre un ticket, d’en offrir un, d’échanger des EtherPoints ou d’utiliser un ticket à gratter, vous devez faire vérifier votre âge. Envoyez une photo du recto et du verso de votre pièce d’identité depuis l’application ou depuis votre profil sur le site.',
        'Un agent habilité de la Mairie examine la pièce et accepte ou refuse la demande. Vous recevez la décision par email, avec le motif en cas de refus, et vous pouvez alors envoyer une nouvelle pièce. Les photos sont chiffrées dès leur réception et effacées au moment de la décision.',
      ],
    },
    {
      heading: 'Portefeuille intégré',
      paragraphs: [
        'BlockLucky crée un portefeuille intégré et effectue avec ce portefeuille les opérations que vous demandez. Sa clé est conservée sous forme chiffrée par le service. Utilisez ce portefeuille uniquement pour la démonstration.',
        'Une dotation de bienvenue en ETH de test vous permet de participer. Les ETH de test n’ont aucune valeur monétaire. La participation ne demande ni carte bancaire, ni achat d’ETH, ni installation de MetaMask.',
      ],
    },
    {
      heading: 'Participation et offres partenaires',
      paragraphs: [
        'Chaque participant peut détenir un seul ticket par tirage. Les dates, le coût en unités de test et les conditions du tirage figurent dans le règlement de participation et dans la fiche du tour.',
        'Les EtherPoints constituent un solde interne distinct des ETH de test. Les offres visibles dans le catalogue, lorsqu’elles sont activées, indiquent le nombre de points nécessaire, leur disponibilité et leurs conditions d’utilisation. Vérifiez les conditions du commerçant avant de demander un code. Les points et les codes ne sont pas convertibles en argent via BlockLucky.',
      ],
    },
    {
      heading: 'Utilisation du service et du chat',
      paragraphs: [
        'Respectez les autres participants et utilisez votre compte sans usurpation, automatisation abusive ou manipulation des participations.',
        `Le chat, lorsqu’il est disponible, est public pour les personnes présentes dans la salle. N’y partagez ni coordonnées, ni codes de connexion, ni informations sensibles. Signalez un contenu ou un comportement à ${C.support}. L’accès peut être limité pour la sécurité du service ou en cas d’abus, avec information de la personne concernée lorsque cela est possible.`,
      ],
    },
    {
      heading: 'Assistance',
      paragraphs: [
        `Un incident peut retarder une transaction ou interrompre un tour. Vérifiez votre historique avant toute nouvelle tentative. Écrivez à la Mairie depuis Paramètres, puis Aide & Support dans l’application, ou à ${C.support}, en indiquant la référence du ticket ou du tour. Le centre d’aide sera proposé ultérieurement.`,
      ],
    },
    {
      heading: 'Données personnelles et fermeture du compte',
      paragraphs: [
        'Depuis les paramètres de l’application, vous pouvez renseigner ou modifier vos prénom et nom et choisir les catégories de notifications reçues. Depuis l’application ou votre profil sur le site, vous pouvez télécharger vos données et demander la fermeture de votre compte. La politique de confidentialité détaille ces traitements. Les droits prévus par la loi restent applicables.',
        'Ces conditions peuvent évoluer avec le prototype. La date de la version en vigueur figure en tête de page.',
      ],
    },
  ],
};

const cguEn: LegalDocument = {
  eyebrow: 'Terms',
  title: 'Terms of use',
  summary: 'Account, wallet, offers and use',
  intro:
    'These terms govern the use of the BlockLucky website and mobile app, an educational prototype of a civic prize draw set in the fictional city of EtherBay. Public information is available without an account. An account is required to take part.',
  sections: [
    {
      heading: 'Publisher and acceptance',
      paragraphs: [
        `The service is published by the ${C.publisherEn}, ${C.address}. By creating an account you accept these terms and the participation rules. The privacy policy explains how your data is used.`,
      ],
    },
    {
      heading: 'Account',
      paragraphs: [
        'Participation is limited to people aged 18 or over. On the mobile app you sign up with an email address and a password, confirmed by an emailed code, or with Google. On the website you confirm you are an adult, then sign in with an emailed code or with Google. Codes are valid for 10 minutes.',
        `Keep your codes and password confidential; two-factor authentication is available under Security. Report any suspicious access to ${C.support}. Merchant and City Hall areas are restricted to authorised people.`,
      ],
    },
    {
      heading: 'Age verification',
      paragraphs: [
        'Before taking or gifting a ticket, redeeming EtherPoints or using a scratch card, you must have your age verified by sending a photo of the front and back of your ID card. An authorised City Hall agent reviews it and you receive the decision by email. Photos are encrypted on receipt and erased when the decision is made.',
      ],
    },
    {
      heading: 'Integrated wallet',
      paragraphs: [
        'BlockLucky creates an integrated wallet whose key is stored encrypted by the service, and uses it for the operations you request. A welcome grant of test ETH lets you take part. Test ETH has no monetary value. No bank card, ETH purchase or MetaMask is needed.',
      ],
    },
    {
      heading: 'Participation and partner offers',
      paragraphs: [
        'Each participant may hold one ticket per draw. Dates, cost in test units and draw conditions are in the participation rules and on the round page. EtherPoints are an internal balance, separate from test ETH. Points and codes cannot be converted into money through BlockLucky.',
      ],
    },
    {
      heading: 'Use of the service and chat',
      paragraphs: [
        `Respect other participants; no impersonation, abusive automation or entry manipulation. The chat, when available, is public to people in the room: do not share contact details, sign-in codes or sensitive information. Report content to ${C.support}. Access may be limited for security or in case of abuse.`,
      ],
    },
    {
      heading: 'Support',
      paragraphs: [
        `An incident may delay a transaction or interrupt a round. Check your history before trying again, then write from Settings, Help & Support in the app, or to ${C.support}, with the ticket or round reference. A help center will be added later.`,
      ],
    },
    {
      heading: 'Personal data and account closure',
      paragraphs: [
        'From the app settings or your website profile you can update your details, choose notification categories, download your data and request account closure. These terms may change with the prototype; the version date is shown at the top.',
      ],
    },
  ],
};

const reglementFr: LegalDocument = {
  eyebrow: 'Règlement',
  title: 'Règlement de participation',
  summary: 'Tour, tirage, gain fictif et remboursement',
  intro:
    'Ce règlement fixe les modalités de participation au tirage BlockLucky : le tour, l’obtention du ticket, le tirage, le gain fictif et le remboursement.',
  sections: [
    {
      heading: 'Organisateur et période',
      paragraphs: [
        `Le tirage BlockLucky est organisé par la ${C.publisher}, ${C.address}, joignable à ${C.support}, dans le cadre du prototype pédagogique d’EtherBay.`,
        'La participation est réservée aux personnes d’au moins 18 ans qui disposent d’un compte et dont l’âge a été vérifié par un agent de la Mairie à partir de leur pièce d’identité. La fiche de chaque tour affiche les heures d’ouverture et de clôture, le fuseau horaire, le prix d’un ticket en ETH de test, le seuil minimum et la capacité maximale.',
      ],
    },
    {
      heading: 'Gratuité',
      paragraphs: [
        'La participation est gratuite. Le ticket est payé avec des ETH de test issus de la dotation de bienvenue offerte à l’inscription. Aucun achat, aucune mise d’argent et aucune conversion en euros ne sont possibles.',
      ],
    },
    {
      heading: 'Comment obtenir un ticket',
      paragraphs: [
        'Chaque participant peut obtenir un seul ticket par tirage. Le ticket est acquis avec des ETH de test issus de la dotation gratuite. Les frais du réseau de test, lorsqu’ils s’appliquent, sont débités en unités de test.',
        'Le ticket confirmé donne une chance au tirage. Le système l’attribue automatiquement, sans choix de numéro. Vérifiez sa confirmation dans votre historique. Si l’option cadeau est proposée, le ticket offert compte pour le bénéficiaire, dans la limite d’un ticket par personne, et un éventuel remboursement revient au portefeuille qui l’a financé.',
      ],
    },
    {
      heading: 'Clôture et résultat',
      paragraphs: [
        'Lorsque la capacité du tour est atteinte, le tirage peut être lancé avant l’heure prévue. À l’échéance, le tirage a lieu si le seuil minimum est atteint. En dessous de ce seuil, le tour est annulé.',
        'Un seul ticket confirmé est sélectionné. Chaque participant détenant un ticket, chacun a la même chance. La page du tirage affiche le résultat après confirmation, avec l’adresse du portefeuille gagnant sous forme abrégée.',
      ],
    },
    {
      heading: 'Cagnotte',
      paragraphs: [
        'Le gagnant reçoit les ETH de test accumulés au titre du tour, après déduction de la part de l’organisateur affichée dans la fiche. Le versement est lancé automatiquement et peut rester en attente de confirmation. La cagnotte est fictive, sans valeur monétaire et sans conversion en euros. Les offres partenaires se consultent séparément dans le catalogue.',
      ],
    },
    {
      heading: 'Annulation et remboursement',
      paragraphs: [
        'Lorsqu’un tour est annulé, le montant du ticket est remboursable en ETH de test au portefeuille qui l’a financé. Les frais réseau déjà consommés ne font pas partie du remboursement.',
        'BlockLucky tente de verser automatiquement les remboursements aux portefeuilles intégrés éligibles. Un incident technique peut retarder la confirmation. Consultez l’état du tour avant de contacter l’assistance.',
      ],
    },
    {
      heading: 'Incident ou réclamation',
      paragraphs: [
        'Un opérateur habilité peut suspendre le service, annuler un tour ou relancer une demande d’aléa après un délai technique. Les changements d’état sont visibles dans l’interface et, selon le réseau, dans le registre du contrat.',
        `Pour une réclamation, écrivez à ${C.support} en indiquant le tour et, si disponible, la référence de transaction.`,
      ],
    },
    {
      heading: 'Jeu responsable',
      paragraphs: [
        'Le prototype limite la participation à un ticket par personne et par tirage. Si les jeux deviennent une difficulté pour vous ou un proche, Joueurs Info Service répond au 09 74 75 13 13 (appel non surtaxé).',
      ],
    },
  ],
};

const reglementEn: LegalDocument = {
  eyebrow: 'Rules',
  title: 'Participation rules',
  summary: 'Round, draw, fictional prize and refund',
  intro:
    'These rules set out how to take part in the BlockLucky draw: the round, the ticket, the draw, the fictional prize and refunds.',
  sections: [
    {
      heading: 'Organiser and period',
      paragraphs: [
        `The draw is organised by the ${C.publisherEn}, ${C.address}, ${C.support}. It is open to people aged 18 or over with an account whose age has been verified by a City Hall agent. Each round page shows opening and closing times, time zone, ticket price in test ETH, minimum threshold and maximum capacity.`,
      ],
    },
    {
      heading: 'Free of charge',
      paragraphs: [
        'Participation is free: the ticket is paid with test ETH from the welcome grant. No purchase, money stake or conversion into euros is possible.',
      ],
    },
    {
      heading: 'Getting a ticket',
      paragraphs: [
        'Each participant may get one ticket per draw, assigned automatically. Test network fees, if any, are charged in test units. Check the confirmation in your history. A gifted ticket counts for the recipient, within the one-ticket limit, and any refund goes back to the paying wallet.',
      ],
    },
    {
      heading: 'Closing and result',
      paragraphs: [
        'When capacity is reached the draw may start early. At the deadline the draw takes place if the minimum threshold is met; otherwise the round is cancelled. One confirmed ticket is selected, each participant having the same chance. The result shows the shortened winning wallet address.',
      ],
    },
    {
      heading: 'Prize pool',
      paragraphs: [
        'The winner receives the test ETH collected for the round minus the organiser share shown on the round page. The payout is automatic and may await confirmation. The prize is fictional and has no monetary value.',
      ],
    },
    {
      heading: 'Cancellation and refund',
      paragraphs: [
        'If a round is cancelled, the ticket amount is refundable in test ETH to the paying wallet, excluding network fees already spent. Refunds are sent automatically when possible; an incident may delay them.',
      ],
    },
    {
      heading: 'Incident or complaint',
      paragraphs: [
        `An authorised operator may pause the service, cancel a round or retry a randomness request. State changes are shown in the interface and, depending on the network, in the contract log. For a complaint, write to ${C.support} with the round and transaction reference.`,
      ],
    },
    {
      heading: 'Responsible play',
      paragraphs: [
        'The prototype allows one ticket per person per draw. If gambling becomes a problem, French helpline Joueurs Info Service answers on 09 74 75 13 13.',
      ],
    },
  ],
};

const mentionsFr: LegalDocument = {
  eyebrow: 'Mentions légales',
  title: 'Mentions légales',
  summary: 'Éditeur, publication et hébergement',
  intro:
    'BlockLucky est un projet pédagogique réalisé par l’équipe BlockLucky (Epitech Digital School), qui simule un événement de la ville fictive d’EtherBay. L’entité ci-dessous édite le site et l’application et en assure la publication.',
  sections: [
    {
      heading: 'Éditeur',
      paragraphs: [
        `${C.publisher}, collectivité territoriale fictive, ${C.address}. Téléphone ${C.phone} (numéro fictif du scénario). Adresse électronique ${C.support}. En tant que collectivité, l’éditeur n’est pas immatriculé au registre du commerce et ne dispose pas de capital social.`,
      ],
    },
    {
      heading: 'Direction de la publication',
      paragraphs: [`${C.director}. Contact ${C.support}.`],
    },
    {
      heading: 'Hébergement',
      paragraphs: [
        `${C.host}, ${C.hostAddress}, pour le service Microsoft Azure. La démonstration publique ${C.demoDomain} est servie depuis une machine virtuelle située dans la région Azure Danemark Est, dans l’Union européenne.`,
      ],
    },
    {
      heading: 'Contact et propriété intellectuelle',
      paragraphs: [
        `Pour une question sur le service ou pour signaler un contenu, écrivez à ${C.support}. Pour une demande relative aux données personnelles, utilisez ${C.dpo}.`,
        'Les textes, visuels, marques et logiciels restent soumis aux droits et licences de leurs titulaires respectifs. Le code source de BlockLucky est diffusé sous licence MIT, indiquée dans le fichier LICENSE du dépôt. Les bibliothèques, polices et icônes tierces restent soumises à leurs propres licences. Conception, textes et visuels : équipe BlockLucky (Epitech Digital School).',
      ],
    },
    {
      heading: 'Pages d’information',
      paragraphs: [
        'Retrouvez les conditions générales d’utilisation, le règlement de participation, la politique de confidentialité, la politique relative aux traceurs et la charte de transparence depuis le pied de page du site et depuis Paramètres, puis Aide & Support dans l’application.',
      ],
    },
  ],
};

const mentionsEn: LegalDocument = {
  eyebrow: 'Legal notice',
  title: 'Legal notice',
  summary: 'Publisher, publication and hosting',
  intro:
    'BlockLucky is an educational project by the BlockLucky team (Epitech Digital School) simulating an event in the fictional city of EtherBay.',
  sections: [
    {
      heading: 'Publisher',
      paragraphs: [
        `${C.publisherEn}, ${C.address}. Phone ${C.phone} (fictional number). Email ${C.support}. As a local authority, the publisher has no trade registration or share capital.`,
      ],
    },
    {
      heading: 'Publication director',
      paragraphs: [`${C.directorEn}. Contact ${C.support}.`],
    },
    {
      heading: 'Hosting',
      paragraphs: [
        `${C.host}, ${C.hostAddressEn}, for Microsoft Azure. The public demo ${C.demoDomain} runs on a virtual machine in the Azure Denmark East region, in the European Union.`,
      ],
    },
    {
      heading: 'Contact and intellectual property',
      paragraphs: [
        `Service questions and content reports: ${C.support}. Personal data requests: ${C.dpo}. The BlockLucky source code is released under the MIT licence (LICENSE file); third-party libraries, fonts and icons keep their own licences.`,
      ],
    },
    {
      heading: 'Information pages',
      paragraphs: [
        'Terms of use, participation rules, privacy policy, tracker policy and transparency charter are linked from the website footer and from Settings, Help & Support in the app.',
      ],
    },
  ],
};

const confidentialiteFr: LegalDocument = {
  eyebrow: 'Protection des données',
  title: 'Politique de confidentialité',
  summary: 'Données du web et de l’application, bases et droits',
  intro: `La ${C.publisher}, Direction des Systèmes d’Information, ${C.address}, traite les données utilisées par le site et l’application BlockLucky. Contact pour vos données et vos droits : ${C.dpo}. Délégué à la protection des données : DPO de la Ville d’EtherBay, ${C.dpo}.`,
  sections: [
    {
      heading: 'Données traitées et raisons de leur utilisation',
      paragraphs: [],
      items: [
        {
          title: 'Compte et sécurité',
          text: 'Adresse électronique, empreinte du mot de passe (application mobile), prénom et nom si vous les renseignez, confirmation de majorité et tranche d’âge déclarées à la connexion web, codes temporaires, informations de session et de double authentification si activée. Base : exécution des conditions d’utilisation ; intérêt légitime pour la sécurité des comptes.',
        },
        {
          title: 'Vérification de l’âge',
          text: 'Photos du recto et du verso de votre pièce d’identité, avec les mentions qu’elle porte, statut de la demande, dates d’envoi et de décision, motif d’un refus et agent ayant statué. Base : protection des mineurs, à laquelle le règlement réserve la participation (base à valider par le DPO).',
        },
        {
          title: 'Portefeuille et participation',
          text: 'Adresse du portefeuille et clé conservée sous forme chiffrée, dotation, ticket, identifiants de transaction, gains et remboursements. Base : exécution du règlement de participation ; l’inscription sur la chaîne rend le tirage vérifiable.',
        },
        {
          title: 'Cadeaux et parrainage',
          text: 'Adresse électronique du bénéficiaire fournie par l’expéditeur, message personnel, code de parrainage, lien entre comptes, ticket offert. Base : exécution des conditions d’utilisation à la demande de l’expéditeur ; pour la personne bénéficiaire, base à valider par le DPO.',
        },
        {
          title: 'Offres et préférences',
          text: 'Solde et mouvements d’EtherPoints, codes réclamés, historique des offres, langue, thème, catégories de notifications et quêtes accomplies. Base : exécution des conditions d’utilisation.',
        },
        {
          title: 'Assistance',
          text: `Objet et texte de votre message, identifiant, adresse électronique, prénom et nom, transmis par email à ${C.support} sans copie dans la base. Base : exécution des conditions d’utilisation.`,
        },
        {
          title: 'Mesure d’audience et pilotage',
          text: 'Sur le web, avec votre accord uniquement : origine de visite, pages consultées et étapes du parcours, reliées à votre compte si vous êtes connecté. Base : consentement. Le serveur enregistre aussi les événements de connexion et d’inscription (fournisseur de connexion, tranche d’âge déclarée) et un journal des actions des agents de la Mairie. Base : intérêt légitime pour le pilotage et la sécurité du service.',
        },
      ],
    },
    {
      heading: 'Origine des données et caractère obligatoire',
      paragraphs: [
        'Votre adresse électronique, la confirmation de votre majorité et la vérification de votre pièce d’identité sont requises pour créer votre compte et participer. Sans ces informations, les pages publiques restent accessibles.',
        'Les données proviennent de vos actions, du système et du registre blockchain. Pour les cadeaux, l’adresse peut être fournie par l’expéditeur. Le service ne demande pas de coordonnées bancaires. La pièce d’identité sert uniquement à vérifier votre âge et ses photos ne sont pas conservées après la décision.',
      ],
    },
    {
      heading: 'Qui peut accéder à ces données',
      paragraphs: [
        'Les personnels habilités de la Mairie accèdent aux informations nécessaires à leurs missions. Seuls les agents administrateurs, protégés par une double authentification, peuvent consulter une pièce d’identité en attente, et chaque consultation est journalisée.',
        `Interviennent selon leur rôle : ${C.host} (hébergement Microsoft Azure dans l’Union européenne), le prestataire d’envoi des emails, le fournisseur d’accès au réseau blockchain de test et Google si vous choisissez de vous connecter avec Google. Lors de l’utilisation d’une offre, le commerçant reçoit les informations utiles à la validation du code. Les personnes présentes dans le chat voient le message et le pseudonyme affichés en direct.`,
      ],
    },
    {
      heading: 'Données visibles sur la blockchain',
      paragraphs: [
        'Sur un réseau public de test, les adresses des portefeuilles, les montants, les références des transactions et les événements de participation, de tirage, de gain, de remboursement ou de badge peuvent être consultés par tous. Un cadeau peut rendre visible le lien entre les portefeuilles du payeur et du bénéficiaire. Une adresse de portefeuille est un pseudonyme qui peut être rattaché à une personne par recoupement. Votre adresse électronique, vos codes d’accès, votre pièce d’identité et la clé privée ne sont pas publiés sur la chaîne.',
        `Un registre public peut être consulté depuis le monde entier, y compris hors de l’Espace économique européen. Seules des adresses pseudonymes et des montants de test y figurent ; les données de la base restent hébergées dans l’Union européenne. Les garanties applicables à cette diffusion sont examinées par le DPO, auprès de qui vous pouvez obtenir des informations à ${C.dpo}. Les transactions confirmées sur une chaîne publique restent accessibles même après la fermeture d’un compte. En démonstration locale ou en mode simulé, ces données restent sur l’infrastructure de démonstration.`,
      ],
    },
    {
      heading: 'Durées de conservation',
      paragraphs: [
        'Le code de connexion ou de vérification reçu par email est valable 10 minutes. Le lien ou code de confirmation d’une demande de suppression est valable 24 heures.',
      ],
      items: [
        {
          title: 'Pièce d’identité',
          text: 'Photos effacées au moment de la décision de l’agent ; le statut et la date de vérification sont conservés avec le compte.',
        },
        {
          title: 'Compte et participation',
          text: 'Durée du pilote, puis anonymisation au plus tard six mois après le bilan.',
        },
        {
          title: 'Points, offres et cadeaux',
          text: 'Même durée que le compte, puis rattachement à l’identifiant du compte anonymisé.',
        },
        {
          title: 'Audience',
          text: 'Événements conservés 13 mois au plus côté serveur ; votre choix est conservé 6 mois sur votre appareil.',
        },
        {
          title: 'Sécurité et audit',
          text: 'Compteurs de tentatives 1 heure, journal des actions des agents 1 an, journaux techniques pendant une durée à valider par le DPO.',
        },
        {
          title: 'Préférences et sauvegardes',
          text: 'Préférences pendant la durée du compte ; durée des sauvegardes à valider par le DPO.',
        },
      ],
    },
    {
      heading: 'Export, fermeture et demandes',
      paragraphs: [
        'Depuis Paramètres, puis Données personnelles dans l’application, ou depuis votre profil sur le site, vous pouvez télécharger un export JSON et demander la fermeture du compte. La confirmation reçue par email supprime notamment l’adresse électronique, le prénom, le nom, le mot de passe, la clé du portefeuille intégré et une pièce d’identité encore en attente. Le solde de test et les gains ou remboursements encore en attente deviennent alors inaccessibles via ce portefeuille.',
        'Certaines traces subsistent : les transactions publiques, le ticket et l’historique des points rattachés à l’identifiant du compte, les événements de mesure déjà enregistrés et le journal des agents, pendant les durées indiquées ci-dessus.',
        `Selon le traitement et les conditions du RGPD, vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation, vous opposer à leur traitement ou demander leur portabilité. Vous pouvez retirer votre consentement à tout moment depuis « Gérer mes traceurs ». Pour exercer vos droits, écrivez à ${C.dpo}. Vous pouvez déposer une réclamation auprès de la CNIL sur cnil.fr.`,
      ],
    },
    {
      heading: 'Décisions automatisées',
      paragraphs: [
        `Le tirage automatise la sélection d’un ticket et l’attribution d’un gain fictif selon les règles du tour. Pour signaler une erreur ou demander un examen humain de votre dossier, contactez ${C.support}. La vérification de l’âge est une décision humaine prise par un agent de la Mairie.`,
      ],
    },
  ],
};

const confidentialiteEn: LegalDocument = {
  eyebrow: 'Data protection',
  title: 'Privacy policy',
  summary: 'Website and app data, legal bases and rights',
  intro: `The ${C.publisherEn}, IT Department, ${C.address}, processes the data used by the BlockLucky website and app. Data and rights contact and data protection officer: ${C.dpo}.`,
  sections: [
    {
      heading: 'Data processed and purposes',
      paragraphs: [],
      items: [
        {
          title: 'Account and security',
          text: 'Email, password hash (mobile app), optional first and last name, age confirmation and age group declared on the website, temporary codes, session and two-factor data. Basis: performance of the terms; legitimate interest for security.',
        },
        {
          title: 'Age verification',
          text: 'Photos of the front and back of your ID card, request status, dates, refusal reason and reviewing agent. Basis: protection of minors (to be validated by the DPO).',
        },
        {
          title: 'Wallet and participation',
          text: 'Wallet address and encrypted key, grant, ticket, transaction references, prizes and refunds. Basis: performance of the participation rules.',
        },
        {
          title: 'Gifts and referral',
          text: 'Recipient email given by the sender, personal message, referral code, account links. Basis for the recipient to be validated by the DPO.',
        },
        {
          title: 'Offers, preferences and support',
          text: `EtherPoints, claimed codes, language, theme, notification categories, quests; support messages emailed to ${C.support} without a database copy. Basis: performance of the terms.`,
        },
        {
          title: 'Audience measurement',
          text: 'On the website and only with your consent: visit source, pages and journey steps, linked to your account when signed in. The server also logs sign-in and sign-up events and City Hall agent actions (legitimate interest).',
        },
      ],
    },
    {
      heading: 'Recipients',
      paragraphs: [
        `Authorised City Hall staff; only administrator agents with two-factor authentication can view a pending ID card, and each view is logged. ${C.host} (Azure hosting in the EU), the email provider, the test blockchain access provider and Google if you sign in with it. Merchants see what is needed to validate a code.`,
      ],
    },
    {
      heading: 'Data visible on the blockchain',
      paragraphs: [
        'On a public test network, wallet addresses, amounts, transaction references and draw events are public and remain after account closure. A wallet address is a pseudonym. Your email, codes, ID card and private key are never published on-chain.',
      ],
    },
    {
      heading: 'Retention',
      paragraphs: [
        'Sign-in and verification codes: 10 minutes. Deletion confirmation: 24 hours. ID photos: erased at decision. Account and participation: pilot duration, then anonymised within six months after the review. Audience events: 13 months at most; your choice: 6 months on your device. Agent log: 1 year. Technical logs and backups: to be validated by the DPO.',
      ],
    },
    {
      heading: 'Export, closure and rights',
      paragraphs: [
        `From Settings, Personal data in the app or your website profile, download a JSON export or request closure; the emailed confirmation deletes your email, name, password, wallet key and any pending ID card. Public transactions and pseudonymous records remain. You may exercise your GDPR rights and withdraw consent at any time via "Manage trackers". Contact ${C.dpo}; you may complain to the CNIL (cnil.fr).`,
        `The draw selects a ticket automatically; to request a human review, contact ${C.support}. Age verification is a human decision.`,
      ],
    },
  ],
};

const traceursFr: LegalDocument = {
  eyebrow: 'Traceurs',
  title: 'Politique relative aux traceurs',
  summary: 'Stockage local, préférences et mesure d’audience',
  intro:
    'BlockLucky utilise le stockage de votre navigateur et celui de l’application pour certaines fonctions. Le site web n’utilise pas de cookie : il emploie le stockage local du navigateur pour les fonctions décrites ci-dessous.',
  sections: [
    {
      heading: 'Ce qui est enregistré',
      paragraphs: [],
      items: [
        {
          title: 'Connexion',
          text: 'Jeton de session et profil sur le web ; données de connexion dans le stockage sécurisé de l’application mobile. Enregistrés après la connexion, effacés à la déconnexion. Le jeton expire après la durée de session fixée par le serveur (12 heures par défaut).',
        },
        {
          title: 'Préférences et fonctions demandées',
          text: 'Langue, thème, état de l’accueil, code de parrainage, établissement sélectionné, dernière offre réclamée. Enregistrés au moment où la fonction est utilisée et conservés sur l’appareil jusqu’à leur effacement. Le code de parrainage est retiré une fois utilisé à la connexion ; la dernière offre réclamée est retirée à la déconnexion. Ces éléments sont strictement nécessaires et ne demandent pas d’accord.',
        },
        {
          title: 'Choix de mesure',
          text: 'Votre choix concernant la mesure d’audience sur le web, avec sa date. Enregistré lorsque vous choisissez et conservé 6 mois ; votre choix vous est ensuite demandé à nouveau.',
        },
        {
          title: 'Mesure d’audience web',
          text: 'Origine de visite, page consultée et étapes du parcours. Certains événements sont reliés à votre compte lorsque vous êtes connecté. Seulement après votre accord ; l’origine de visite est conservée sur l’appareil jusqu’au retrait de votre accord ou à l’expiration de votre choix, et les événements 13 mois au plus sur le serveur.',
        },
      ],
    },
    {
      heading: 'Vos choix sur le web',
      paragraphs: [
        'Au premier accès, un bandeau vous propose « Tout refuser » ou « Tout accepter ». Tant que vous n’avez pas accepté, l’origine de visite n’est ni enregistrée ni lue et aucun événement de mesure n’est envoyé. Vous pouvez revenir sur votre choix à tout moment depuis « Gérer mes traceurs », en pied de page ou sur cette page. Refuser la mesure ne bloque ni la navigation ni la participation, et retire l’origine de visite déjà enregistrée.',
        'Les traceurs strictement nécessaires à une fonction demandée, comme la session ou le code de parrainage reçu par lien, servent à la rendre disponible.',
      ],
    },
    {
      heading: 'Application mobile',
      paragraphs: [
        'L’application mobile conserve uniquement la session et le profil dans le stockage sécurisé de l’appareil. Vos préférences de langue, de thème et de notifications sont enregistrées avec votre compte. Elle ne dépose aucun traceur de mesure d’audience et n’envoie pas les événements de mesure du site web.',
        'Les journaux enregistrés par le serveur lors du fonctionnement du service, comme les événements de connexion, sont décrits dans la politique de confidentialité.',
      ],
    },
    {
      heading: 'Effacer le stockage',
      paragraphs: [
        'Vous pouvez effacer le stockage local depuis les réglages de votre navigateur, ou désinstaller l’application. Cette action peut déconnecter votre session et supprimer les préférences enregistrées sur cet appareil.',
      ],
    },
  ],
};

const traceursEn: LegalDocument = {
  eyebrow: 'Trackers',
  title: 'Tracker policy',
  summary: 'Local storage, preferences and audience measurement',
  intro:
    'BlockLucky uses your browser storage and the app storage for some features. The website sets no cookie; it uses browser local storage.',
  sections: [
    {
      heading: 'What is stored',
      paragraphs: [],
      items: [
        {
          title: 'Sign-in',
          text: 'Session token and profile on the website; secure storage in the mobile app. Removed on sign-out; the token expires after the server session duration (12 hours by default).',
        },
        {
          title: 'Preferences and requested features',
          text: 'Language, theme, onboarding state, referral code, selected shop, last claimed offer. Strictly necessary, kept on the device until removed.',
        },
        {
          title: 'Measurement choice',
          text: 'Your audience measurement choice and its date, kept for 6 months before you are asked again.',
        },
        {
          title: 'Website audience measurement',
          text: 'Visit source, page and journey steps, linked to your account when signed in. Only after consent; events kept 13 months at most on the server.',
        },
      ],
    },
    {
      heading: 'Your choices on the website',
      paragraphs: [
        'On your first visit a banner offers "Refuse all" or "Accept all". Until you accept, no visit source is stored or read and no measurement event is sent. Change your choice at any time with "Manage trackers" in the footer or on this page. Refusing blocks neither browsing nor taking part.',
      ],
    },
    {
      heading: 'Mobile app',
      paragraphs: [
        'The mobile app only keeps the session and profile in the device secure storage; preferences are saved with your account. It sets no audience tracker and sends no website measurement events. Server logs are described in the privacy policy.',
      ],
    },
    {
      heading: 'Clearing storage',
      paragraphs: [
        'You can clear local storage in your browser settings or uninstall the app. This may sign you out and remove preferences saved on this device.',
      ],
    },
  ],
};

const transparenceFr: LegalDocument = {
  eyebrow: 'Transparence',
  title: 'Charte de transparence du tirage',
  summary: 'Preuves consultables et leurs limites, selon le réseau',
  intro:
    'La charte explique ce que vous pouvez vérifier pour chaque tour, depuis la confirmation de votre ticket jusqu’au versement du gain de test.',
  sections: [
    {
      heading: 'Avant le tirage',
      paragraphs: [
        'La fiche du tour indique le réseau utilisé, la référence du contrat, le coût d’un ticket, la date de clôture, le seuil minimum de tickets, la capacité maximale et la part de l’organisateur.',
        'L’objectif de 10 000 participants désigne des personnes. La capacité du contrat compte les tickets. Chaque personne ne peut détenir qu’un ticket par tirage : un ticket correspond donc à un participant.',
      ],
    },
    {
      heading: 'Comment le ticket gagnant est sélectionné',
      paragraphs: [
        'Après la clôture, le contrat enregistre une demande d’aléa. Il utilise la réponse reçue pour sélectionner un ticket parmi ceux qui sont confirmés. L’animation montre que le résultat est en cours ou qu’il a été confirmé. Le résultat affiché vient du contrat lorsque le mode sur chaîne est actif.',
      ],
    },
    {
      heading: 'Ce que vous pouvez vérifier selon l’environnement',
      paragraphs: [],
      items: [
        {
          title: 'Démonstration Hardhat',
          text: 'Les événements et les transactions se consultent sur le réseau local. Le coordinateur Chainlink VRF y est simulé : le tirage n’est pas certifié par Chainlink. Les références locales ne renvoient pas à un explorateur public.',
        },
        {
          title: 'Sepolia, si effectivement déployé',
          text: 'Sur le réseau public de test, consultez le contrat, la transaction et l’identifiant de la demande VRF. Le coordinateur Chainlink peut fournir un aléa vérifiable si le service est configuré et utilisé sur ce réseau.',
        },
        {
          title: 'Mode simulé du backend',
          text: 'Les références affichées sont des références de démonstration. Ce mode ne produit aucune preuve blockchain publique.',
        },
      ],
    },
    {
      heading: 'Où retrouver les éléments du tour',
      paragraphs: [
        'Ouvrez votre historique pour retrouver le reçu de votre ticket. Sur la page du tirage, consultez le numéro du tour, le statut, la référence de la demande d’aléa et, si disponibles, le lien de transaction et l’adresse abrégée du gagnant.',
        'Le versement et le remboursement ont leur propre état de confirmation. Une référence de demande seule ne prouve pas que la réponse ou le versement a abouti.',
      ],
    },
    {
      heading: 'Qui intervient en cas d’incident',
      paragraphs: [
        'Les opérateurs habilités peuvent mettre le contrat en pause, annuler un tour ou relancer une demande d’aléa selon les conditions du contrat. Les événements du contrat permettent de retracer ces actions lorsqu’elles sont enregistrées sur la chaîne.',
        'La preuve porte sur l’exécution observable du tirage. Les règles d’éligibilité, le fonctionnement du site et la gestion des comptes relèvent aussi de l’organisateur.',
      ],
    },
    {
      heading: 'Ethers de test',
      paragraphs: [
        'Le prototype fonctionne exclusivement avec des unités de test sans valeur monétaire. Aucune somme d’argent réelle n’est collectée ni redistribuée.',
      ],
    },
  ],
};

const transparenceEn: LegalDocument = {
  eyebrow: 'Transparency',
  title: 'Draw transparency charter',
  summary: 'Verifiable evidence and its limits, by network',
  intro:
    'This charter explains what you can check for each round, from your ticket confirmation to the test prize payout.',
  sections: [
    {
      heading: 'Before the draw',
      paragraphs: [
        'The round page shows the network, contract reference, ticket cost, closing date, minimum ticket threshold, maximum capacity and organiser share. The 10,000 target counts people; contract capacity counts tickets. Each person may hold one ticket per draw, so one ticket equals one participant.',
      ],
    },
    {
      heading: 'How the winning ticket is selected',
      paragraphs: [
        'After closing, the contract records a randomness request and uses the response to select one confirmed ticket. The displayed result comes from the contract when on-chain mode is active.',
      ],
    },
    {
      heading: 'What you can check, by environment',
      paragraphs: [],
      items: [
        {
          title: 'Hardhat demo',
          text: 'Events and transactions are on the local network. The Chainlink VRF coordinator is simulated: the draw is not certified by Chainlink, and local references do not link to a public explorer.',
        },
        {
          title: 'Sepolia, if actually deployed',
          text: 'On the public test network, check the contract, the transaction and the VRF request ID. Chainlink can provide verifiable randomness if the service is configured and used.',
        },
        {
          title: 'Backend simulated mode',
          text: 'References are demo references. This mode produces no public blockchain evidence.',
        },
      ],
    },
    {
      heading: 'Where to find round details',
      paragraphs: [
        'Your history holds your ticket receipt. The draw page shows round number, status, randomness request reference and, when available, the transaction link and shortened winner address. A request reference alone does not prove the response or payout succeeded.',
      ],
    },
    {
      heading: 'Who acts in case of incident',
      paragraphs: [
        'Authorised operators may pause the contract, cancel a round or retry a randomness request. Contract events trace these actions when recorded on-chain. Eligibility rules, the website and accounts remain the organiser’s responsibility.',
      ],
    },
    {
      heading: 'Test ethers',
      paragraphs: ['The prototype only uses test units with no monetary value.'],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocId, Record<LegalLanguage, LegalDocument>> = {
  cgu: { FR: cguFr, EN: cguEn },
  reglement: { FR: reglementFr, EN: reglementEn },
  mentions: { FR: mentionsFr, EN: mentionsEn },
  confidentialite: { FR: confidentialiteFr, EN: confidentialiteEn },
  traceurs: { FR: traceursFr, EN: traceursEn },
  transparence: { FR: transparenceFr, EN: transparenceEn },
};

export const getLegalDocument = (id: LegalDocId, language: LegalLanguage): LegalDocument =>
  LEGAL_DOCUMENTS[id][language] ?? LEGAL_DOCUMENTS[id].FR;
