# Reformulation des besoins

- Date : 2026-11-11
- Source : kickoff « RUSH BlockLucky - Création d'un Smart Contract » (Epitech Digital School, DIGI3)

## 1. Le besoin en une phrase

La Ville d'EtherBay veut une loterie de fin d'année ouverte à toute la population, digitale, transparente et pédagogique. Son cœur est un smart contract « solide et sécurisé » :

- les citoyens achètent des tickets en ethers fictifs ;
- un gagnant est tiré au hasard après un certain nombre de participants ou une certaine durée ;
- ce gagnant remporte la cagnotte.

## 2. Contexte

- EtherBay compte 120 000 habitants, dont 35 % ont entre 18 et 35 ans : c'est la cible principale.
- L'événement à digitaliser est la loterie des fêtes de fin d'année.
- Objectif chiffré : au moins 10 000 participants.
- Critères de sélection de l'appel à projet :
  1. un smart contract solide et sécurisé ;
  2. la capacité à convaincre les parties prenantes de la pertinence de la solution, de sa facilité d'utilisation et de sa capacité à garantir transparence et confiance.

## 3. Besoins par partie prenante

### Madame la Maire

| Ce qu'elle a exprimé | Besoin reformulé | Réponse du projet | Preuve dans le dépôt |
|---|---|---|---|
| « Un événement mémorable » | Un temps fort collectif et vécu en direct | Tirage annoncé en temps réel (Socket.io, salle d'attente, chat en direct), badge POAP de participation conservé sur la blockchain | `backend/src/socket/`, `contracts/BlockLuckyPOAP.sol` |
| « Un succès auprès de la communauté » | Atteindre 10 000 participants | Inscription sans mot de passe, cadeau de ticket par email, parrainage, classement, EtherPoints échangeables chez les commerçants | `api/lottery` (gift, leaderboard), `api/user` (referrals), `api/marketplace` |
| « Faire parler de l'événement » | Viralité et visibilité | Ticket offert à un proche, invitation, site de l'Office de Tourisme | `frontend-web/src/app/invite`, `frontend-office-tourisme/` |
| « Qu'il soit inclusif » | Aucun prérequis technique ni financier | Portefeuille Ethereum créé automatiquement, dotation de bienvenue de la Mairie, pas de MetaMask ni d'achat de crypto, web et mobile | ADR 0004, `backend/src/blockchain/wallet.service.ts`, `mobile-app/` |
| Image de ville innovante, pédagogie | Expliquer la blockchain | Charte de transparence vulgarisée, liens vers l'explorateur, preuve VRF | `frontend-web/src/app/transparence` |

### Responsable événementiel

| Ce qu'il a exprimé | Besoin reformulé | Réponse du projet | Preuve dans le dépôt |
|---|---|---|---|
| Aspect pratique de l'événement | Piloter le jeu sans compétence blockchain | Dashboard Mairie : statut du tour, tirage, annulation avec remboursement, disjoncteur, reversement de la commission | `frontend-web/src/app/mairie`, `api/admin` |
| Facilité d'utilisation | Acheter un ticket en un geste | Achat en un clic signé par le portefeuille intégré, plafonds de jeu responsable | `POST /api/v1/lottery/buy` |
| Fluidité de l'expérience | Pas d'attente ni d'échec visible | Tirage automatique par le keeper, versement automatique de la cagnotte et des remboursements, file d'actions avec reprise, messages d'erreur clairs (solde insuffisant, tirage en cours, pause) | `lottery.keeper.ts`, `chain-actions.ts`, `lottery.gateway.ts` |
| Pic d'affluence au moment du tirage | Tenir la charge | Files BullMQ, idempotence des achats, tests de charge k6 | `load-tests/`, `docs/operations.md` |

### DSI

| Ce qu'il a exprimé | Besoin reformulé | Réponse du projet | Preuve dans le dépôt |
|---|---|---|---|
| Sécurité | Contrat et plateforme résistants aux attaques connues | Contrat : réentrance bloquée, pull payments, rôles, pause, erreurs typées, Slither en CI. Plateforme : clés chiffrées AES-256-GCM, MFA administrateur, OTP email, CSP, limites de débit, gitleaks, CodeQL | `smart-contract/`, `docs/securite.md`, `SECURITY.md` |
| Fiabilité | Résultat juste et fonds jamais bloqués | Hasard Chainlink VRF prouvé, `requestDraw` appelable par tous, relance après délai, remboursement intégral en cas d'annulation, indexeur idempotent avec curseur | `contracts/BlockLucky.sol`, `lottery.indexer.ts` |
| Efficacité | Coût et performance maîtrisés | Optimiseur Solidity, rapport de gaz, cache Redis, worker séparé, mode testnet sans coût réel | `npm run test:gas`, `docker-compose.yml` |
| Maintenabilité | Pouvoir faire évoluer et exploiter | CI par projet, 47 tests du contrat avec 100 % des lignes couvertes, tests d'intégration sur nœud réel, ADR, runbooks, objectifs de service | `.github/workflows/ci.yml`, `docs/` |

## 4. Attentes de la ville et indicateurs

| Attente du kickoff | Indicateur proposé | Comment le mesurer |
|---|---|---|
| Éducatif : sensibiliser à la blockchain | Part des participants ayant consulté la charte ou une transaction sur l'explorateur | Événements analytiques front, visites de `/transparence` |
| Engagement : au moins 10 000 participants | Participants distincts par tour, objectif 10 000 | `progression.distinctParticipants` de `GET /lottery/status`, jauge affichée |
| Innovation : positionner EtherBay | Retombées presse et réseaux, badges POAP frappés | Nombre de POAP frappés (événements `Transfer` émis depuis l'adresse zéro par `BlockLuckyPOAP`) |
| Transparence : confiance totale | 100 % des tickets et tirages vérifiables sur la chaîne, zéro écart entre la chaîne et la base | Contrat vérifié sur Etherscan, indexeur à partir de la chaîne |
| Collaboration Mairie - Epitech | Livrables remis et soutenance | Dépôt, documentation, démonstration Sepolia |

## 5. Hors périmètre assumé

- Les mises en euros ou en ethers réels sont exclues pour des raisons juridiques (voir la [veille juridique](veille-juridique.md)).
- L'achat de crypto-monnaie par les citoyens n'est pas proposé.
- Le déploiement sur le réseau Ethereum principal n'est pas prévu.
