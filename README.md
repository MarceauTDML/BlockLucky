# BlockLucky - Ville d'EtherBay

Loterie citoyenne de fin d'année de la Ville d'EtherBay, sur Ethereum. Les citoyens achètent leurs tickets en ethers fictifs auprès d'un smart contract Solidity, avec un portefeuille intégré créé pour eux. Le gagnant est tiré au sort par Chainlink VRF et reçoit automatiquement la cagnotte. Le projet comprend une API, une application web, une application mobile et le site de l'Office de Tourisme.

**Documentation officielle : [docs.etherbay.tech](https://docs.etherbay.tech)**

Architecture, smart contracts, référence de l'API, base de données, sécurité, juridique, exploitation et guides pratiques y sont décrits en détail. Les sources de la documentation sont dans [`documentation-officielle/`](documentation-officielle/).

## Démarrer en local

Prérequis : Node.js 22 et Docker Desktop.

1. Démarrer PostgreSQL, Redis, Mailpit et la blockchain locale (nœud Hardhat, contrats déployés, oracle Chainlink VRF simulé) :

   ```bash
   docker compose up -d --wait
   ```

2. Lancer l'API sur http://localhost:2053 :

   ```bash
   cd backend && cp .env.example .env && npm ci && npx prisma generate && npm run prisma:deploy && npm run prisma:seed && npm run dev
   ```

3. Lancer l'application web sur http://localhost:3000 :

   ```bash
   cd frontend-web && cp .env.example .env && npm ci && npm run dev
   ```

La connexion se fait par un code envoyé par email, visible dans Mailpit sur http://localhost:8025.

Application mobile, stack complète en conteneurs, tests, déploiement sur Sepolia : voir le [démarrage rapide](https://docs.etherbay.tech/demarrage/prerequis.html) de la documentation.

## Projets du dépôt

| Dossier | Contenu |
| --- | --- |
| `smart-contract/` | Contrats Solidity `BlockLucky` et `BlockLuckyPOAP`, Hardhat 3, tests et déploiement |
| `backend/` | API REST, temps réel et workers |
| `frontend-web/` | Espaces citoyen, commerçant et Mairie |
| `mobile-app/` | Application citoyenne iOS et Android |
| `frontend-office-tourisme/` | Site de l'Office de Tourisme |
| `documentation-officielle/` | Sources et site de la documentation officielle |
