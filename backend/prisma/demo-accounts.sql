\set ON_ERROR_STOP on
\if :{?mairie}
\else
  \echo 'Variables attendues : -v mairie=... -v partenaire=... -v joueur1=... [-v joueur2=...] [-v pwhash=...]'
  \quit
\endif
\if :{?partenaire}
\else
  \echo 'Variable partenaire manquante'
  \quit
\endif
\if :{?joueur1}
\else
  \echo 'Variable joueur1 manquante'
  \quit
\endif
\if :{?pwhash}
\else
  \set pwhash ''
\endif

BEGIN;

CREATE TEMP TABLE demo_account (email text, role "Role", age "AgeVerificationStatus", points int) ON COMMIT DROP;
INSERT INTO demo_account VALUES
  (lower(:'mairie'),     'ADMIN',   'VERIFIED', 1000),
  (lower(:'partenaire'), 'PARTNER', 'VERIFIED', 500),
  (lower(:'joueur1'),    'USER',    'NONE',     600);
\if :{?joueur2}
INSERT INTO demo_account VALUES (lower(:'joueur2'), 'USER', 'NONE', 600);
\endif

INSERT INTO "User" (
  id, "walletAddress", email, "passwordHash", role, "isEmailVerified", "ageVerificationStatus", "ageVerifiedAt",
  "pointsBalance", "referralCode", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'demo-' || substr(md5(d.email || random()::text), 1, 20),
  d.email,
  NULLIF(:'pwhash', ''),
  d.role,
  true,
  d.age,
  CASE WHEN d.age = 'VERIFIED' THEN now() ELSE NULL END,
  d.points,
  gen_random_uuid()::text,
  now(),
  now()
FROM demo_account d
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  "passwordHash" = COALESCE(EXCLUDED."passwordHash", "User"."passwordHash"),
  "isEmailVerified" = true,
  "ageVerificationStatus" = CASE WHEN EXCLUDED.role = 'USER' THEN "User"."ageVerificationStatus" ELSE EXCLUDED."ageVerificationStatus" END,
  "ageVerifiedAt" = CASE WHEN EXCLUDED.role = 'USER' THEN "User"."ageVerifiedAt" ELSE COALESCE("User"."ageVerifiedAt", now()) END,
  "pointsBalance" = GREATEST("User"."pointsBalance", EXCLUDED."pointsBalance"),
  "deletedAt" = NULL,
  "updatedAt" = now();

INSERT INTO "PointTransaction" (id, "userId", amount, "actionType", description, "createdAt")
SELECT gen_random_uuid()::text, u.id, d.points, 'SOCIAL_QUEST', 'Dotation du compte de démonstration', now()
FROM demo_account d
JOIN "User" u ON u.email = d.email
WHERE NOT EXISTS (
  SELECT 1 FROM "PointTransaction" p
  WHERE p."userId" = u.id AND p.description = 'Dotation du compte de démonstration'
);

CREATE TEMP TABLE demo_partner (name text, logo text) ON COMMIT DROP;
INSERT INTO demo_partner VALUES
  ('La Boulangerie du Port d''EtherBay', 'https://assets.etherbay.fr/partners/boulangerie.png'),
  ('Cinéma Le Phare EtherBay', 'https://assets.etherbay.fr/partners/cinema.png');

INSERT INTO "Partner" (id, name, "logoUrl", "isActive", "ownerId", "createdAt")
SELECT gen_random_uuid()::text, p.name, p.logo, true, owner.id, now()
FROM demo_partner p
CROSS JOIN (SELECT id FROM "User" WHERE email = lower(:'partenaire')) owner
WHERE NOT EXISTS (SELECT 1 FROM "Partner" x WHERE x.name = p.name);

CREATE TEMP TABLE demo_reward (partner text, title text, cost int, stock int) ON COMMIT DROP;
INSERT INTO demo_reward VALUES
  ('La Boulangerie du Port d''EtherBay', '-15 % sur les viennoiseries et pains spéciaux', 100, 100),
  ('La Boulangerie du Port d''EtherBay', 'Une galette des rois offerte pour 2 achetées', 200, 50),
  ('Cinéma Le Phare EtherBay', '1 place de cinéma achetée = 1 place offerte', 150, 200),
  ('Cinéma Le Phare EtherBay', 'Un menu popcorn offert', 80, 150);

INSERT INTO "RewardCatalog" (id, "partnerId", title, "costInPoints", "totalStock", "remainingStock", "isActive", "createdAt")
SELECT gen_random_uuid()::text, p.id, r.title, r.cost, r.stock, r.stock, true, now()
FROM demo_reward r
JOIN "Partner" p ON p.name = r.partner
WHERE NOT EXISTS (SELECT 1 FROM "RewardCatalog" x WHERE x."partnerId" = p.id AND x.title = r.title);

SELECT u.email, u.role, u."ageVerificationStatus" AS age, u."pointsBalance" AS points,
       (u."passwordHash" IS NOT NULL) AS mot_de_passe
FROM demo_account d
JOIN "User" u ON u.email = d.email
ORDER BY u.role DESC, u.email;

COMMIT;
