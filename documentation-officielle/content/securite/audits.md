# Audits et checklists

Deux audits par checklist ont été menés pendant le projet : un audit d'infrastructure d'environ 245 points et un audit de sécurité d'environ 300 points. Cette page présente leur structure, explique ce que leurs fichiers de travail permettent d'établir et donne, thème par thème, l'état du dépôt vérifié dans le code.

## Ce que les fichiers d'audit permettent d'établir

> [!IMPORTANT]
> Les deux checklists sont des grilles de référence. Dans leurs exports de travail, la colonne Statut de chaque ligne vaut « À faire » et l'onglet de synthèse de la checklist de sécurité affiche zéro point « Fait ». Les grilles ont servi de liste de contrôle pendant le durcissement du dépôt, mais leur suivi n'a pas été reporté dans les fichiers. **Ces fichiers ne permettent donc pas d'établir un taux de conformité**, et cette page n'en donne aucun. La synthèse ci-dessous a été établie en vérifiant chaque thème directement dans le dépôt ; chaque mesure déclarée faite renvoie à sa preuve.

### Checklist d'infrastructure

Chaque ligne décrit un anti-modèle, la règle à appliquer, les outils de référence et une priorité (Haute, Moyenne, Basse). Les 245 points se répartissent en huit thèmes :

| Thème | Points |
|---|---|
| Architecture et organisation du code | 35 |
| Base de données (PostgreSQL) | 35 |
| Cache et asynchronisme (Redis) | 34 |
| Performance et passage à l'échelle | 31 |
| Expérience développeur et tests | 30 |
| CI/CD et déploiement | 28 |
| Observabilité et supervision | 28 |
| Haute disponibilité et résilience | 24 |

### Checklist de sécurité

Chaque ligne donne une mesure, la règle ou la norme de référence (OWASP ASVS et MASVS, ANSSI, CNIL), une priorité, la plateforme concernée et des colonnes de suivi (Statut, Responsable, Date cible, Preuve). La grille rappelle qu'un point « Fait » doit être prouvé par un test, une configuration ou un rapport, et que ses points juridiques ne remplacent pas l'avis d'un avocat ou d'un DPO.

| Priorité | Signification | Points |
|---|---|---|
| P0 | Indispensable avant toute mise en ligne | 123 |
| P1 | Avant le lancement public | 118 |
| P2 | Avec la croissance | 48 |
| P3 | Applications très sensibles (banque, santé) | 11 |

Les 300 points sont répartis en 22 catégories. Elles structurent la synthèse ci-dessous.

## Synthèse de l'audit de sécurité

Légende : **fait** (preuve dans le dépôt), **partiel** (mesure présente mais incomplète), **absent**, **sans objet** (fonction inexistante dans BlockLucky).

### Authentification (18 points) et authentification avancée (12 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Hachage et politique de mot de passe, mots de passe compromis | sans objet | Aucun mot de passe ; connexion par code email |
| Limitation des tentatives | fait | 30 requêtes par IP en 10 minutes, 10 échecs par compte en une heure, [`backend/src/services/otp-challenge.service.ts`](src:backend/src/services/otp-challenge.service.ts) |
| TOTP conforme RFC 6238, secret de 160 bits chiffré, anti-rejeu | fait | [`backend/src/services/totp.service.ts`](src:backend/src/services/totp.service.ts), test d'anti-rejeu |
| Codes de récupération hachés, usage unique | fait | [Authentification](authentification.md#codes-de-secours) |
| MFA obligatoire pour les administrateurs | partiel | Imposée par `requireRoles`, mais la méthode email n'ajoute pas de facteur ; voir [Limites](authentification.md#limites-connues) |
| Comparaison en temps constant | fait | `safeEqual` |
| Notifications de sécurité | fait | Modèle `security-alert` |
| Vérification de l'email avant création du compte | fait | Test `exige le code envoyé par email...` |
| Ré-authentification avant action sensible | partiel | Désactivation de la 2FA seulement |
| Anti-énumération | partiel | Réponse de `/login` différente pour un compte TOTP |
| Passkeys et WebAuthn, MFA résistant au hameçonnage | absent | |
| CAPTCHA, détection de connexions suspectes | absent | |

### Sessions et jetons (13 points), sessions et cryptographie avancées (10 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Validation stricte des JWT, durée limitée | fait | [`backend/src/services/session.service.ts`](src:backend/src/services/session.service.ts) |
| Déconnexion effective, révocation de tous les appareils | fait | [Sessions](sessions.md#revocation) |
| Pas de jeton dans l'URL | partiel | Jeton de session jamais dans l'URL ; le jeton de suppression RGPD figure dans le lien de l'email |
| Cookies `HttpOnly`, `Secure`, `SameSite`, préfixe `__Host-` | sans objet | Pas de cookie ; jeton dans `localStorage` sur le web |
| Stockage du jeton côté web | partiel | `localStorage`, exposé en cas de XSS |
| Rotation des jetons de rafraîchissement | sans objet | Pas de jeton de rafraîchissement |
| Liste des sessions actives | absent | |
| Rotation des clés de signature, clés par utilisateur, crypto-shredding | absent | |

### Autorisation et contrôle d'accès (12 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Autorisation côté serveur sur chaque route, refus par défaut | fait | [Matrice des droits](autorisations.md#matrice-complete) |
| Protection IDOR | fait | `assertPartnerAccess`, routes utilisateur sans identifiant en paramètre |
| Anti-affectation de masse, anti-escalade | fait | Schémas Zod, aucune route ne modifie un rôle |
| Back-office protégé | fait | `router.use(authenticate, requireRoles('ADMIN'))` |
| Identifiants non prédictibles | fait | UUID v7 |
| Revue périodique des accès | absent | |

### Injections et validation des entrées (18 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Requêtes paramétrées | fait | Prisma uniquement |
| Validation par schéma, listes blanches | fait | [Validation des entrées](validation.md) |
| Échappement des sorties (emails, CSV) | fait | `escapeHtml`, `neutralizeSpreadsheetCell` |
| Commandes système, XXE, SSTI, désérialisation | sans objet | Aucune de ces fonctions n'existe |
| Validation des paramètres de requête et des événements temps réel | partiel | `limit` non borné sur le classement, événements de chat non validés |

### Sécurité navigateur (14 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| CSP | partiel | Stricte sur le site de l'Office de Tourisme ; `'unsafe-inline'` dans `script-src` sur le web, absente en développement |
| HSTS, `nosniff`, anti-clickjacking, `Referrer-Policy`, `Permissions-Policy`, COOP | fait | [`frontend-web/next.config.mjs`](src:frontend-web/next.config.mjs), [`frontend-office-tourisme/docker/security-headers.conf`](src:frontend-office-tourisme/docker/security-headers.conf) |
| CSRF | sans objet | Jeton en en-tête `Authorization` |
| CORS restrictif | fait | Liste d'origines explicite |
| Aucun secret ni source map dans le front | fait | Contrôle de CI du job `web` |
| Subresource Integrity | sans objet | Aucune ressource tierce chargée |

### Chiffrement et secrets (13 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Chiffrement applicatif des champs sensibles | fait | AES-256-GCM, [Cryptographie et secrets](cryptographie-secrets.md) |
| Aléa cryptographique | fait | `crypto.randomInt`, `crypto.randomBytes` |
| Aucun secret dans Git | fait | gitleaks |
| Secrets par environnement, refus des valeurs de développement | partiel | Quatre secrets contrôlés ; identifiants S3 et SMTP non contrôlés |
| Rotation des secrets, gestionnaire de secrets, KMS | absent | Aucun script de re-chiffrement |
| TLS, certificats | hors dépôt | Fournis par le proxy de déploiement |

### API et réseau (15 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Limitation de débit générale et sur l'authentification | fait | [Protection des API](protection-api.md#limitation-de-debit) |
| Webhooks entrants signés | fait | HMAC, fenêtre de 5 minutes, anti-rejeu |
| Idempotence | partiel | Côté serveur sur quatre routes ; les clients n'envoient pas l'en-tête |
| Erreurs sans fuite, en-têtes de version masqués | fait | Gestionnaire d'erreurs, `helmet`, `poweredByHeader: false`, `server_tokens off` |
| Délais d'expiration | fait | [`backend/src/server.ts`](src:backend/src/server.ts), `statement_timeout` |
| Pagination obligatoire | partiel | Plafond de 100 pour l'historique, pas pour le classement |
| Protection DDoS, WAF | absent | |
| Concurrence (race conditions) | partiel | Contraintes d'unicité en base ; validation d'un code promo non atomique |

### Fichiers et téléversements (10 points)

Sans objet pour l'essentiel : l'API n'accepte aucun fichier. Les codes promo arrivent sous forme de texte CSV borné à 200 000 caractères, et les exports sont écrits par le serveur dans un compartiment S3.

### Infrastructure et chaîne logicielle (18 points), chaîne logicielle et développement (10 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Mises à jour, scan de vulnérabilités, lockfiles | fait | Dependabot, `npm audit`, Trivy, `npm ci` |
| SAST | fait | CodeQL, Slither |
| Divulgation responsable | fait | [`SECURITY.md`](src:SECURITY.md), `security.txt` |
| Base non exposée | fait | Ports liés à `127.0.0.1` dans [`docker-compose.yml`](src:docker-compose.yml) |
| Conteneurs durcis | fait | `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, utilisateurs non root |
| Sécurité de la CI | fait | Actions épinglées par SHA, permissions minimales ; voir [Chaîne logicielle](chaine-logicielle.md) |
| Délai d'adoption des nouvelles versions | fait | `cooldown` de 5 jours |
| DAST, test d'intrusion, SBOM, builds signés | absent | |
| Protection des branches, accès serveurs, DNS | hors dépôt | Non vérifiable dans le code |

### Journalisation et incidents (11 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Données interdites absentes des journaux | fait | Emails masqués, aucun code ni secret journalisé |
| Journal des actions d'administration | partiel | Disjoncteur, trésorerie, statut des partenaires, exports ; pas le tirage ni l'annulation manuels |
| Plan de réponse aux incidents, notification CNIL | fait (documentaire) | [Réponse aux incidents](../infrastructure/incidents.md) |
| Coupe-circuit | fait | `MAINTENANCE_MODE`, disjoncteur du contrat |
| Centralisation, conservation et alertes | absent | Journaux sur la sortie standard, purge à mettre en place |

### Mobile (15 points) et mobile avancé (8 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Stockage sécurisé des secrets | fait | `expo-secure-store`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |
| Pas de secret dans le binaire | fait | Variables `EXPO_PUBLIC_*` limitées à des URL |
| Sauvegarde système exclue | fait | `allowBackup: false` |
| Épinglage de certificat, détection de root, attestation, masquage d'écran, mise à jour forcée | absent | [Navigateur et mobile](navigateur-mobile.md#ce-qui-n-est-pas-en-place) |

### Logique métier et fraude (15 points)

| Mesure | État | Preuve ou commentaire |
|---|---|---|
| Montants calculés côté serveur et contrat | fait | Prix vérifié par le contrat (`IncorrectPayment`) |
| Bornes des valeurs métier | fait | Quantité de 1 à 10, plafond par joueur dans le contrat, limite de jeu responsable |
| Machine à états | fait | `RoundStatus` du contrat |
| Anti-abus du parrainage | partiel | Points de parrainage attribués seulement après vérification de l'email ; pas de contrôle de comptes multiples |
| Tests automatisés des autorisations | fait | [`backend/__tests__/api/auth-security.test.ts`](src:backend/__tests__/api/auth-security.test.ts) |
| Double validation des actions critiques | absent | Une seule personne ADMIN suffit pour le tirage, le disjoncteur et la trésorerie |

### RGPD et vie privée (23 points), juridique et conformité (20 points), gouvernance des données (10 points)

Ces catégories sont traitées dans la partie [Juridique et conformité](../juridique/rgpd.md). En résumé : registre des traitements, export et anonymisation sont faits ; purges automatiques, analyse d'impact, contrats de sous-traitance et mentions légales complètes sont absents ou à valider. La liste à faire valider figure dans [Points à valider](../juridique/points-a-valider.md).

### Architecture et API avancées (10 points), infrastructure et cloud avancés (15 points), organisation (10 points)

Ces catégories visent un hébergement en nuage et une organisation d'entreprise. Le dépôt ne contient ni infrastructure en code, ni compte cloud, ni processus d'équipe formalisé : elles relèvent du déploiement, décrit dans [Déploiement sur etherbay.tech](../infrastructure/deploiement-etherbay.md), et ne sont pas évaluables ici. Seule la validation de l'en-tête `Host` est concernée par le code : elle est absente (voir [Validation](validation.md#limites-connues)).

## Synthèse de l'audit d'infrastructure

| Thème | Fait, avec preuve | Absent ou partiel |
|---|---|---|
| Architecture | Monolithe modulaire par domaine ([ADR 0001](../architecture/adr/0001-monolithe-modulaire.md)), TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` dans [`backend/tsconfig.json`](src:backend/tsconfig.json) | Pas de règle de lint sur les frontières entre modules, pas de table outbox |
| Base de données | Migrations expand et contract ([ADR 0003](../architecture/adr/0003-migrations-expand-contract.md)), contrôle de dérive du schéma en CI, délai par requête, pool borné, `pg_stat_statements` | Pas de réplique en lecture |
| Redis | Repli mémoire ([ADR 0002](../architecture/adr/0002-redis-files-et-repli-memoire.md)), délai de 500 ms par commande, dispersion des durées de cache, préfixe par environnement | Le repli affaiblit la révocation et la limitation de débit |
| Files | Tentatives bornées avec recul exponentiel et conservation des échecs dans [`backend/src/queues/queue.options.ts`](src:backend/src/queues/queue.options.ts) | Pas d'alerte sur les tâches en échec |
| Observabilité | Métriques Prometheus protégées, identifiant de requête, journaux structurés ([Observabilité](../backend/observabilite.md)) | Pas de centralisation des journaux |
| Haute disponibilité | Sondes `live`, `ready`, `deep`, arrêt gracieux sur `SIGTERM`, RPC de secours, worker séparé | Instance unique, pas de bascule automatique de base |
| CI/CD | Filtre par projet modifié, cache, construction des images, intégration sur une vraie chaîne | Pas de déploiement automatisé dans la CI |
| Performance et tests | Scénarios k6 versionnés avec seuils ([Tests de charge](../infrastructure/tests-charge.md)), tests unitaires, d'intégration et sur chaîne | Tests de charge non exécutés en CI |

## Constats ouverts

Les écarts relevés pendant la rédaction de cette documentation, classés par priorité suggérée :

| Priorité | Constat | Page |
|---|---|---|
| Haute | Le propriétaire VRF hérité (déployeur) peut changer le coordinateur et donc le gagnant | [Clés et garde des portefeuilles](cles-portefeuilles.md#roles-sur-la-chaine) |
| Haute | `cancelRound` permet à l'opérateur de censurer un tirage en devançant la réponse VRF | [Modèle de menaces](menaces.md#front-running-et-ordre-des-transactions) |
| Haute | Aucun outil de rotation de `ENCRYPTION_KEY` | [Cryptographie et secrets](cryptographie-secrets.md#rotation) |
| Moyenne | La 2FA par email n'ajoute pas de facteur ; le TOTP remplace le code email | [Authentification](authentification.md#limites-connues) |
| Moyenne | `withdrawFees` du backend suppose que l'opérateur détient `DEFAULT_ADMIN_ROLE` | [Clés et garde des portefeuilles](cles-portefeuilles.md#compte-operateur) |
| Moyenne | `'unsafe-inline'` dans `script-src` alors que le jeton est dans `localStorage` | [Navigateur et mobile](navigateur-mobile.md#politique-csp) |
| Moyenne | Le lien de confirmation RGPD de l'email pointe vers une page web inexistante | [RGPD](../juridique/rgpd.md#effacement) |
| Basse | `limit` non borné sur `/api/lottery/leaderboard`, événements de chat non validés | [Validation des entrées](validation.md#limites-connues) |
| Basse | Validation d'un code promo non atomique | [Autorisations](autorisations.md#limites-connues) |

Pour reprendre un audit, dupliquer la grille, renseigner la colonne Preuve avec un lien vers le fichier ou le test, et ne marquer « Fait » qu'une mesure prouvée.
