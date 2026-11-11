# BlockLucky - Backend

API REST Express 5, temps réel Socket.IO, workers BullMQ et intégration blockchain (portefeuilles intégrés, indexeur, keeper), sur PostgreSQL et Redis.

**Documentation : [docs.etherbay.tech](https://docs.etherbay.tech)**

- [Structure et cycle d'une requête](https://docs.etherbay.tech/backend/structure.html)
- [Variables d'environnement](https://docs.etherbay.tech/backend/variables-environnement.html)
- [Référence de l'API](https://docs.etherbay.tech/backend/reference-api.html)
- [Intégration blockchain](https://docs.etherbay.tech/integration-blockchain/index.html)
- [Base de données](https://docs.etherbay.tech/base-de-donnees/modele.html)
- [Tests](https://docs.etherbay.tech/backend/tests.html)

## Démarrer

```bash
cp .env.example .env
```

```bash
npm ci
```

```bash
npx prisma generate && npm run prisma:deploy && npm run prisma:seed
```

```bash
npm run dev
```
