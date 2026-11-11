# Dictionnaire de données

Cette page décrit chaque table, chaque colonne et chaque énumération de la base PostgreSQL du backend. Les tableaux ne sont pas écrits à la main : ils sont **générés à chaque construction de la documentation** à partir de [`backend/prisma/schema.prisma`](src:backend/prisma/schema.prisma) et des fichiers SQL de [`backend/prisma/migrations/`](src:backend/prisma/migrations/migration_lock.toml). Une colonne ajoutée au schéma apparaît donc ici sans intervention ; seule sa description doit être rédigée.

La vue d'ensemble des relations, avec le diagramme entité-association, est sur la page [Modèle de données](modele.md). La justification de chaque index et de chaque contrainte est sur la page [Index et contraintes](index-contraintes.md).

## Mode de lecture

Chaque modèle Prisma fait l'objet d'une section. Le nom du modèle est aussi le nom de la table PostgreSQL, entre guillemets doubles dans le SQL car il contient des majuscules : `SELECT * FROM "User";`. De même pour les colonnes : `"walletAddress"`.

Les colonnes du tableau de chaque modèle se lisent ainsi :

| Colonne | Signification |
|---|---|
| Champ | Nom du champ dans le schéma Prisma, identique au nom de la colonne SQL |
| Type | Type Prisma : `String` (texte), `Int` (entier 32 bits), `Float` (flottant double précision), `Boolean`, `DateTime`, `Json` (JSONB), un nom d'énumération, ou `relation vers …` pour un champ de relation. Le suffixe `[]` désigne un tableau PostgreSQL |
| Obligatoire | `oui` si la colonne est `NOT NULL` ; `non` pour un champ facultatif (`?` dans le schéma), un tableau ou une relation multiple |
| Défaut | Valeur par défaut du schéma : `uuid(7)` (UUID version 7 généré par Prisma), `uuid()` (UUID version 4), `now()` (date d'insertion), une constante ou une valeur d'énumération |
| Contraintes | Clé primaire, unicité, mise à jour automatique (`@updatedAt`), type PostgreSQL précis (`Timestamptz(3)`), clé étrangère avec son comportement à la suppression |
| Rôle | Description fonctionnelle |

### Champs de relation

Les lignes de type `relation vers …` ne correspondent à **aucune colonne** en base. Ce sont les champs de navigation du client Prisma : `ticket.user`, `user.tickets`. La colonne réelle est la clé étrangère qui les accompagne (`userId`, `lotteryId`…), signalée dans la colonne Contraintes par « clé étrangère » et le comportement `ON DELETE` quand il est précisé dans le schéma. Quand il ne l'est pas, Prisma applique `Restrict` pour une relation obligatoire et `SetNull` pour une relation facultative.

### Index et contraintes de la table

Sous chaque tableau, une liste reprend les attributs de bloc du schéma (`@@index`, `@@unique`) et les contraintes CHECK trouvées dans les migrations. Les CHECK ne sont pas exprimables dans le schéma Prisma : elles n'existent que dans le SQL, et la génération va les y chercher.

### Exemple de lecture

Dans la section `Ticket`, la ligne `ticketIndex` indique un `Int` non obligatoire. Avec la ligne d'unicité `@@unique([lotteryId, ticketIndex])`, cela se lit : en mode onchain, un numéro de ticket ne peut apparaître qu'une fois par tour ; en mode simulé, la colonne reste vide, et PostgreSQL considère deux valeurs `NULL` comme distinctes, si bien que les tickets simulés ne se gênent pas entre eux.

## Conventions transverses

- **Identifiants** : tous en `String`. Les UUID v7 (`uuid(7)`) sont triables par date de création. `User.referralCode` utilise un UUID v4 (`uuid()`), non prévisible. `ChainCursor.id` est fixé par le code.
- **Dates** : `DateTime` est stocké en `TIMESTAMPTZ(3)`, au fuseau UTC, avec une précision à la milliseconde.
- **Montants** : les montants en wei sont en `String` pour rester exacts ; `prizePool` est en ETH flottant, pour l'affichage.
- **Adresses** : stockées en minuscules.
- **Données sensibles** : `walletEncryptedKey` et `twoFactorSecret` sont chiffrées par l'application (AES-256-GCM) ; `Token.token` et `twoFactorBackupCodes` sont des empreintes SHA-256. Aucune colonne ne contient de secret en clair. Voir [Cryptographie et secrets](../securite/cryptographie-secrets.md).
- **Suppression** : les comptes ne sont jamais supprimés physiquement par l'application ; ils sont anonymisés et `deletedAt` est renseigné.

## Mise à jour de cette page

Les descriptions viennent du fichier `documentation-officielle/content/_data/modele-donnees.json`, organisé ainsi :

```json
{
  "modeles": { "User": { "description": "…", "champs": { "id": "…" } } },
  "enumerations": { "Role": { "description": "…", "valeurs": { "USER": "…" } } }
}
```

Après une modification de `schema.prisma`, il faut ajouter dans ce fichier la description de chaque nouveau champ, modèle, énumération ou valeur. La construction de la documentation signale chaque description manquante, et le job CI `documentation` échoue tant qu'il en reste.

## Tables et colonnes

{{generated:dictionnaire-donnees}}
