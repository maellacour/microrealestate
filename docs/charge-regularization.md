# Régularisation des charges — Spécification

> Statut : validé, prêt pour développement. Contexte : fork résidentiel FR
> (particulier-à-particulier). Auteur de la réflexion : besoin exprimé par le
> bailleur, spécifié avec Claude Code.

## Problème

MRE appelle « charges » deux choses distinctes, sans lien entre elles :

1. **Provisions / forfait** — ce que le locataire paie chaque mois en plus du
   loyer. Modélisé aujourd'hui par `Tenant.properties[].expenses[]`
   (`{ title, amount, beginDate, endDate }`), ajouté à chaque terme par le
   pipeline de loyer (`services/api/src/businesslogic/tasks/1_base.js`).
2. **Dépenses bailleur** — le module `Expense` récent
   (`works`, `insurance`, `property_tax`, …). Purement informatif, alimente le
   rapport « Résultats par bien ». **Privé bailleur, jamais visible du locataire.**

Il manque le **pont** entre les provisions encaissées par le locataire et les
charges réelles récupérables : la **régularisation annuelle**.

## Vocabulaire (figé)

- **Dépenses** = coûts du bailleur, rentabilité, privé bailleur.
- **Provisions / Forfait** = ce que paie le locataire (existe déjà).
- **Régularisation** = le pont annuel provisions ↔ charges réelles récupérables.

## Cadre métier (résidentiel FR)

- **Bail avec provisions** (nu, loi 89-462) : provisions mensuelles **+
  régularisation annuelle**. On compare les provisions appelées sur la période
  aux charges réelles **récupérables** (décret 87-713) → solde : complément dû
  par le locataire, ou trop-perçu à lui rembourser.
- **Bail au forfait** (souvent meublé / colocation) : montant fixe, **pas de
  régularisation**. Reste informatif.
- Les charges réelles proviennent en général du **décompte du syndic**, avec la
  mention récupérable / non récupérable (parfois ligne à ligne, parfois en récap
  global). Certaines charges sont **hors syndic** (ex. électricité) et saisies à
  la main.
- **Charges récupérables ≠ catégories du module Dépenses.** C'est le bailleur
  qui coche « récupérable » d'après le décompte syndic — pas de détection auto.

## Décisions verrouillées

| Sujet | Décision |
|---|---|
| Régime | Flag **par location** : `Tenant.chargesMode = 'provisions' \| 'forfait'`, défaut `provisions`. **Forfait ⇒ régularisation désactivée, aucun impact sur le montant.** |
| Source | **Saisie autonome, découplée** du module Dépenses. Liste de lignes libres `{ label, amount, recoverable }` → récap global (1 ligne) ou détail, + charges externes ajoutées à la main. |
| Provisions retenues | **Appelées** (dues sur la période), pas encaissées. |
| Période | **Librement réglable** (début / fin), pré-remplie sur l'année civile. |
| Calcul | `recoverable = Σ lignes récupérables` ; `solde = provisions appelées − recoverable`. |
| Décompte locataire | **Récupérable uniquement** — les lignes non récupérables ne lui sont pas montrées. |
| Complément dû | Optionnel : poster une **ligne d'ajustement sur un terme**, ou rester informatif. |
| Trop-perçu | **Hors loyer par défaut** (remboursement séparé), avec option de créditer un terme. |
| Partage | Option (settings) pour exposer le décompte dans l'app locataire. **Off par défaut.** À approfondir. |

## Modèle de données

- `Tenant.chargesMode: 'provisions' | 'forfait'` — nouveau champ, défaut `provisions`.
- Nouvelle collection `ChargeRegularization` :
  `{ realmId, tenantId, periodStart, periodEnd, lines: [{ label, amount, recoverable }], note, createdDate, updatedDate }`.
- Le décompte se calcule à la volée : provisions appelées lues depuis les termes,
  total récupérable depuis les lignes cochées `recoverable`.

## Découpage (maîtrise du risque)

Le pipeline de calcul de loyer (`1_base` → `7_total`) est le code le plus
critique et le plus testé du repo → **on n'y touche pas au cœur du MVP.**

- **Phase 1 — cœur, sans risque loyer**
  - champ `chargesMode` sur le locataire ;
  - écran de régularisation (saisie des lignes, période) ;
  - calcul du solde ;
  - décompte **PDF informatif**.
  - Aucune modification du pipeline. Exploitable de bout en bout.
- **Phase 2 — opt-in, avec tests**
  - poster le solde en **ligne d'ajustement sur un terme** (complément dû / crédit) ;
  - touche `1_base`…`7_total` → **uniquement avec tests de non-régression**.
- **Phase 3 — optionnel**
  - partage du décompte dans l'app locataire + réglage settings.

## Hors périmètre MVP

- Baux **multi-biens** : v1 régularise au niveau de la location (agrégée).
- Interaction avec le **dépôt de garantie** (retenir un trop-perçu sur la restitution).
- Détection automatique du caractère récupérable.
