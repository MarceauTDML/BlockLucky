# Comptes de démonstration et connexion

On se connecte à BlockLucky de deux façons selon le client. L'application mobile utilise un email et un mot de passe, ou Google et Apple quand ils sont configurés. Le frontend web n'a pas de mot de passe : il envoie un code à 6 chiffres par email. Cette page décrit les comptes créés par le seed, le déroulement de la connexion en local, la vérification d'âge et les particularités des comptes partenaire et administrateur.

## Les comptes du seed

Le script [`backend/prisma/seed.ts`](src:backend/prisma/seed.ts), lancé par `npm run prisma:seed`, crée trois comptes, un tour et deux commerces.

| Email | Rôle | EtherPoints | Particularité | Espace après connexion |
|---|---|---|---|---|
| `citoyen@etherbay.fr` | `USER` | 250 | Parrainé par le compte de la Mairie | `/accueil` |
| `boulangerie@etherbay.fr` | `PARTNER` | 500 | Propriétaire des deux commerces | `/partenaire` |
| `maire@etherbay.fr` | `ADMIN` | 1 000 | Doit activer la 2FA avant d'accéder au dashboard | `/mairie` |

Les trois comptes ont l'email marqué comme vérifié, le mot de passe de démonstration `EtherBay2026demo` et l'âge vérifié (`ageVerificationStatus = VERIFIED`) : ils peuvent jouer sans envoyer de pièce d'identité. Relancer le seed remet ce mot de passe et ce statut sur les comptes existants. Ces adresses sont fictives : les emails n'arrivent que dans Mailpit.

> [!CAUTION]
> `EtherBay2026demo` est publié dans le dépôt et dans cette documentation. Le seed ne doit jamais être lancé sur une base de production.

| Donnée | Contenu |
|---|---|
| Tour | `contractRoundId` 1, statut `OPEN` |
| La Boulangerie du Port d'EtherBay | « -15% sur les viennoiseries et pains spéciaux » (100 points, 95 sur 100 en stock) ; « Une Galette des Rois offerte pour 2 achetées » (200 points, 50 sur 50) |
| Cinéma Le Phare EtherBay | « 1 Place de Cinéma achetée = 1 Place offerte » (150 points, 180 sur 200) |

### Le portefeuille des comptes du seed

Le seed n'écrit pas de vrai portefeuille : il enregistre des adresses factices (`0xadmin0000...etherbay`, `0xcitizen000...etherbay`) qui servent seulement de clé unique, et aucune clé chiffrée. Le vrai portefeuille est créé à la première opération qui en a besoin, par `ensureWallet` de [`backend/src/blockchain/wallet.service.ts`](src:backend/src/blockchain/wallet.service.ts) :

- à l'affichage du portefeuille (`GET /api/v1/lottery/wallet`, appelé par la page d'accueil) ;
- ou au premier achat ou cadeau.

À ce moment, le backend remplace l'adresse factice par une adresse Ethereum réelle, chiffre la clé, puis verse la dotation de bienvenue (0,5 ETH fictif par défaut). Un nouveau compte inscrit par l'interface reçoit, lui, son portefeuille dès l'inscription.

> [!NOTE]
> Le tour n° 1 du seed porte une cagnotte de 12,5 qui ne correspond à rien sur la chaîne. Elle est remplacée par la vraie valeur, lue sur le contrat, au premier appel de `GET /api/v1/lottery/status`.

## Se connecter en local

### Depuis le web

1. Ouvrir `http://localhost:3000/connexion` pour un citoyen, ou `http://localhost:3000/connexion?espace=pro` pour un partenaire ou la Mairie (sans les écrans d'onboarding).
2. Confirmer avoir 18 ans ou plus, saisir l'email du compte et valider.
3. Ouvrir Mailpit sur `http://localhost:8025` : l'email « Votre code de connexion - BlockLucky » contient le code à 6 chiffres, valable 10 minutes.
4. Saisir le code sur la page `/connexion/verification`.

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant W as Frontend web
    participant B as Backend
    participant M as Mailpit
    U->>W: Email et majorité confirmée
    W->>B: POST /api/v1/auth/login
    B->>M: Code à 6 chiffres
    B-->>W: requiresTwoFactor, userId, devOtpPreview
    U->>M: Lit le code
    U->>W: Saisit le code
    W->>B: POST /api/v1/auth/2fa/verify
    B-->>W: Jeton de session et profil
    W->>U: Redirection selon le rôle
```

Un email inconnu crée un compte citoyen au moment de la vérification du code : portefeuille, dotation de bienvenue, 25 EtherPoints de bienvenue et email de bienvenue. N'importe quelle adresse fictive fonctionne en local, par exemple `test1@etherbay.fr`. Ce nouveau compte n'a pas l'âge vérifié : l'achat lui répond 403 tant qu'il n'a pas envoyé de pièce d'identité, depuis `/profil/identite` ou depuis le mobile, et que la Mairie ne l'a pas validée (voir plus bas).

### Le code dans la réponse de l'API

Quand `NODE_ENV=development` (valeur de `.env.example`), la réponse de `POST /api/v1/auth/login` contient aussi le code dans le champ `devOtpPreview`. Il est visible dans l'onglet Réseau des outils de développement du navigateur, ou directement avec curl :

```bash
curl -s -X POST http://localhost:2053/api/v1/auth/login -H "content-type: application/json" -d '{"walletAddress":"0x0000000000000000000000000000000000000001","email":"citoyen@etherbay.fr","provider":"EMAIL","isAdultConfirmed":true}'
```

```json
{
  "success": true,
  "message": "Authentification réussie",
  "data": {
    "requiresTwoFactor": true,
    "twoFactorMethod": "EMAIL",
    "userId": "019a...",
    "devOtpPreview": "123456"
  }
}
```

Le code se valide ensuite avec l'identifiant renvoyé :

```bash
curl -s -X POST http://localhost:2053/api/v1/auth/2fa/verify -H "content-type: application/json" -d '{"userId":"019a...","code":"123456"}'
```

La réponse contient `token`, à passer dans l'en-tête `Authorization: Bearer <token>` des appels suivants. Le champ `walletAddress` du corps de connexion est obligatoire et doit avoir le format d'une adresse Ethereum, mais il ne sert qu'à retrouver un compte existant : le web et le mobile y envoient une valeur dérivée de l'email (`generateDeterministicWallet`). Le vrai portefeuille est toujours créé par le backend.

> [!CAUTION]
> `devOtpPreview` n'existe qu'en `NODE_ENV=development`. Il n'apparaît ni en test ni en production.

### Depuis l'application mobile

L'écran de connexion demande l'email et le mot de passe. Avec un compte du seed, saisir par exemple `citoyen@etherbay.fr` et `EtherBay2026demo` : la session s'ouvre sans code email, puisque `/auth/signin` n'en demande que si la 2FA est active.

```bash
curl -s -X POST http://localhost:2053/api/v1/auth/signin -H "content-type: application/json" -d '{"email":"citoyen@etherbay.fr","password":"EtherBay2026demo"}'
```

L'inscription d'un nouveau compte se fait sur l'écran « Créer un compte » : email, mot de passe d'au moins 10 caractères avec une lettre et un chiffre, acceptation des conditions. Un code à 6 chiffres part dans Mailpit (et dans `devOtpPreview` en développement), à saisir sur `Verify2FAScreen`. « Mot de passe oublié » suit le même principe avec un code de réinitialisation.

Les boutons Google et Apple répondent 503 tant que `GOOGLE_CLIENT_IDS` et `APPLE_CLIENT_IDS` sont vides dans `backend/.env`, ce qui est le cas par défaut ; sur le mobile, le bouton Google est aussi désactivé sans les variables `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`. Voir [Authentification mobile](../mobile/authentification.md#google-et-apple).

Les comptes inscrits par le web peuvent aussi se connecter sur le mobile après avoir défini un mot de passe par « Mot de passe oublié ».

## Vérification d'âge d'un nouveau compte

Avec `AGE_VERIFICATION_REQUIRED=true` (valeur par défaut, obligatoire en production), un compte qui n'est pas vérifié reçoit `403 Vérifiez votre âge pour jouer.` à l'achat, au cadeau, à l'échange d'une récompense et au ticket à gratter. Pour en vérifier un en local :

1. Sur le mobile, se connecter avec le nouveau compte : l'écran de vérification d'âge s'ouvre de lui-même. Envoyer une photo du recto et du verso, JPEG ou PNG de 4 Mo au plus chacune ; n'importe quelle image de test fait l'affaire.
2. Sur le web, se connecter avec `maire@etherbay.fr` (2FA activée, voir ci-dessous), ouvrir `/mairie/identites`, ouvrir la demande et l'approuver.
3. L'email de décision arrive dans Mailpit. Sur le mobile, rouvrir l'écran de vérification d'âge pour rafraîchir le statut affiché.

L'envoi peut aussi se faire depuis le web : ouvrir `/profil/identite` avec le nouveau compte, choisir les deux images, cocher le consentement et envoyer. Après l'approbation, recharger `/billetterie` ou revenir sur l'onglet suffit pour pouvoir acheter : la page relit le statut, sans nouvelle connexion. Pour des essais rapides, `AGE_VERIFICATION_REQUIRED=false` dans `backend/.env` supprime ce contrôle.

## Compte Mairie : activer la double authentification

Avec `ADMIN_MFA_REQUIRED=true` (valeur par défaut, obligatoire en production), toute route réservée au rôle `ADMIN` répond 403 avec le message « La double authentification est obligatoire pour les comptes d'administration. Activez-la depuis votre profil. » tant que la 2FA n'est pas active, avec le code `ADMIN_MFA_REQUIRED` dans `errors.code`. Le dashboard `/mairie` est donc inutilisable à la première connexion : chacune de ses pages affiche alors ce motif et un bouton « Activer la double authentification » qui mène à `/profil/securite/2fa` ([`AdminQueryError`](src:frontend-web/src/components/admin/AdminQueryError.tsx)).

1. Se connecter avec `maire@etherbay.fr` depuis `/connexion?espace=pro`.
2. Ouvrir `/profil/securite/2fa`.
3. Choisir l'une des deux méthodes :
   - **Application (TOTP)** : scanner le QR code avec une application d'authentification, noter les codes de secours affichés une seule fois, puis saisir un code de l'application ;
   - **Email** : saisir le code reçu dans Mailpit (prérempli en développement grâce à `devOtpPreview`).
4. L'activation révoque toutes les sessions existantes, puis délivre une nouvelle session à l'appareil courant. Les autres appareils doivent se reconnecter.

| Méthode activée | Connexion suivante |
|---|---|
| Email | Code envoyé par email, comme avant |
| Application TOTP | Plus d'email : le backend demande directement un code de l'application ou un code de secours |

Pour désactiver la 2FA, il faut un code valide ou une connexion de moins de 15 minutes. La sécurité de ces mécanismes est détaillée dans [Authentification et 2FA](../securite/authentification.md).

## Compte partenaire

`boulangerie@etherbay.fr` arrive sur `/partenaire`, qui propose de choisir l'un de ses deux établissements. Il peut créer des offres, importer des codes et valider en caisse les codes présentés par les citoyens. La 2FA n'est pas obligatoire pour ce rôle.

## Scénario de démonstration

Ce scénario couvre le parcours complet en local avec deux participants, le minimum pour qu'un tour puisse être tiré (`minTicketsToDraw` vaut 2). Chaque participant n'a qu'un ticket par tour.

1. Se connecter avec `citoyen@etherbay.fr`, attendre l'affichage du solde sur l'accueil, puis acheter un ticket sur `/billetterie`, qui n'en propose qu'un.
2. Dans une fenêtre de navigation privée, se connecter avec `boulangerie@etherbay.fr`, déjà vérifié, et acheter un ticket. Une nouvelle adresse peut aussi servir, après la vérification d'âge décrite plus haut. Un second achat avec le même compte répond 409.
3. Attendre la fin du tour : 30 minutes après son ouverture en local (le compte à rebours de l'accueil l'indique). Un tour expiré avec moins de deux tickets est annulé par le keeper et un nouveau tour s'ouvre. Avec deux tickets ou plus, le tour entre en salle d'attente pendant `DRAW_REVEAL_DELAY_SECONDS` (600 s par défaut), puis le keeper le tire : `DrawRequested`, réponse de l'oracle local en quelques secondes, puis `WinnerPicked`.
4. Suivre l'annonce sur `/tirage` ; la cagnotte est versée automatiquement au gagnant.
5. Avec `maire@etherbay.fr`, consulter `/mairie`, mettre le contrat en pause depuis `/mairie/securite`, constater que l'achat est refusé, puis le réactiver.

Le test automatisé `npm run test:chain` du backend joue un scénario équivalent sans attendre, en avançant l'horloge du nœud.

## Désactiver les protections en développement

`LOGIN_EMAIL_CODE_REQUIRED`, `ADMIN_MFA_REQUIRED` et `AGE_VERIFICATION_REQUIRED` peuvent être passées à `false` dans `backend/.env` pour accélérer certains essais : la connexion par `/auth/login` délivre alors directement une session, un administrateur sans 2FA accède au dashboard et un compte non vérifié peut jouer. `DRAW_REVEAL_DELAY_SECONDS=0` supprime l'attente avant le tirage. La suite de tests le fait dans [`backend/__tests__/setup-env.ts`](src:backend/__tests__/setup-env.ts).

> [!WARNING]
> Ces trois variables ne peuvent pas être désactivées en production : le backend refuse de démarrer. Ne pas prendre l'habitude de les désactiver, au risque de ne plus tester le vrai parcours.

## Créer d'autres comptes partenaire ou administrateur

Aucune route ni aucun écran ne permet d'attribuer un rôle. Un compte créé par l'interface est toujours `USER`. Pour promouvoir un compte en local, après sa première connexion :

```sql
UPDATE "User" SET role = 'PARTNER' WHERE email = 'nouveau@etherbay.fr';
```

Le backend relit le rôle en base à chaque requête protégée : si le rôle ne correspond plus à celui de la session, il répond « Droits révoqués ou modifiés : reconnectez-vous ». Il suffit alors de se reconnecter.
