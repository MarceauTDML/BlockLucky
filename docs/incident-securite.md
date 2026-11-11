# Plan de réponse aux incidents de sécurité

## Gravité

| Niveau | Exemples | Délai de prise en charge |
|---|---|---|
| P1 | Fuite de données personnelles, compte administrateur compromis, secret de production exposé | Immédiat |
| P2 | Vulnérabilité exploitable sans fuite constatée, indisponibilité du service | 4 heures |
| P3 | Vulnérabilité difficile à exploiter, comportement anormal isolé | 2 jours ouvrés |
| P4 | Amélioration de durcissement | Prochain sprint |

## Rôles et contacts

| Rôle | Responsabilité | Contact |
|---|---|---|
| Responsable de l'incident | Coordonne, décide du confinement, tient la chronologie | DSI EtherBay, dsi@etherbay.fr |
| Référent technique | Diagnostic, correctif, restauration | Équipe BlockLucky |
| DPO | Qualification de la violation de données, notification CNIL | dpo@etherbay.fr |
| Communication | Information des citoyens et partenaires | Service communication de la Ville |

## Étapes

1. **Détection** : signalement (`SECURITY.md`), alerte, comportement anormal dans les logs (`requestId`) ou `/metrics`.
2. **Confinement** selon le cas :
   - compte compromis : révocation de toutes ses sessions (bouton « Déconnecter tous mes appareils » du profil, ou `POST /api/auth/logout` avec `allDevices: true`), puis reconfiguration de la 2FA ; si l'utilisateur ne peut plus agir, changement de son rôle en base (ses jetons perdent leurs droits immédiatement) ou, en dernier recours, rotation de `JWT_SECRET` ;
   - secret de production exposé : rotation immédiate (`JWT_SECRET` invalide toutes les sessions, `WEBHOOK_SECRET`, `ENCRYPTION_KEY` avec re-chiffrement des secrets TOTP, `RELAYER_PRIVATE_KEY` avec transfert des fonds) ;
   - fonctionnalité vulnérable : `MAINTENANCE_MODE=true` ou disjoncteur du Smart Contract (`/api/admin/circuit-breaker`).
3. **Éradication** : correctif, test de non-régression ajouté à la suite de tests, déploiement.
4. **Restauration** : vérification de `/health/ready`, du taux d'erreurs et des journaux d'administration.
5. **Retour d'expérience** : post-mortem écrit sous 10 jours ouvrés, sans recherche de coupable (chronologie, cause racine, impact, actions avec responsable et échéance).

## Violation de données personnelles

- Le DPO qualifie la violation et la consigne dans le registre des violations, même si elle n'est pas notifiée.
- Si elle présente un risque pour les personnes : notification à la CNIL dans les 72 heures suivant sa découverte (téléservice de la CNIL, article 33 RGPD).
- Si le risque est élevé : information des personnes concernées dans les meilleurs délais, en termes clairs, avec les mesures prises et les précautions à prendre (article 34).

## Journal de l'incident

Chaque incident tient une chronologie horodatée en UTC : détection, décisions, actions, personnes impliquées, communications. Elle sert de base au post-mortem et à la notification éventuelle.
