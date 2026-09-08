# Colocation (shared rental) — réflexion avant développement

> Statut : discovery / options, **non figé**. À valider avec le bailleur avant
> tout dev. Contexte : fork résidentiel FR (particulier-à-particulier).

## Le besoin

Un bien est géré en **colocation** (plusieurs occupants dans un même logement).
Aujourd'hui il est modélisé comme **deux biens distincts** (un par chambre),
avec un locataire par bien. C'est jouable mais :

- repasser en **bail unique** (un seul logement) est manuel et compliqué ;
- les **charges** (provisions + régularisation) sont naturellement au niveau du
  logement, pas de la chambre → répartition manuelle pénible ;
- les parties communes / compteurs communs n'ont pas de place naturelle.

Objectif du doc : cartographier ce que MRE permet aujourd'hui, les points de
friction, et les options d'amélioration avec leurs compromis.

## Ce que MRE permet aujourd'hui

Rappel du modèle (voir aussi `CLAUDE.md`) :

- Un **Tenant** (= une location/tenancy) porte : un contrat, des dates, un
  ensemble `properties[]` (chaque entrée = un bien + son loyer + ses charges +
  dates d'entrée/sortie), et surtout des **`contacts[]`** (nom/téléphone/email,
  plusieurs possibles).
- Le **loyer est calculé par Tenant** (pipeline `1_base`→`7_total`). Il n'y a
  **pas** de notion de part de loyer ni de paiement par personne.
- L'app **locataire** retrouve une location par l'**email d'un contact**
  (`contacts.email`). Donc **chaque colocataire listé en contact peut se
  connecter** et voir la même location.
- L'**occupation d'un bien** (vacant / occupé) est dérivée des locataires qui le
  référencent, en prenant le **plus récent** comme occupant principal
  (`propertymanager` → `tenants[0]`). Le formulaire de bail **n'interdit pas** de
  rattacher un bien déjà occupé (il l'étiquette « occupé par … »).
- Aucun concept de **colocation / colocataire** n'existe dans le code
  (seul « shared lease » existe = un bail couvrant plusieurs biens).

### Les modèles possibles avec l'existant

| # | Montage | Loyer | Charges / régul. | Accès locataire | Limite principale |
|---|---|---|---|---|---|
| **A. Bail unique solidaire** : 1 Tenant, 1 bien (le logement), colocataires en `contacts[]` | 1 loyer global | au niveau logement (nickel avec la feature charges) | chaque colocataire via son email | pas de part ni de paiement par personne |
| **B. 1 Tenant, plusieurs biens (chambres)** via `properties[]` | somme des loyers de chambres | par chambre, ou globales à répartir à la main | contacts | le logement est éclaté en sous-biens fictifs |
| **C. Baux individuels** : 1 Tenant par colocataire, chacun sa chambre-bien (**ton montage actuel**) | 1 loyer par colocataire | par chambre → communes à répartir à la main | chacun le sien | pas de vue d'ensemble ; bascule vers bail unique pénible |
| **D. Plusieurs Tenants sur le même bien** (1 par colocataire, tous pointant le logement) | 1 loyer (part) par colocataire | logement | chacun le sien | occupation/résultats supposent **un** occupant principal → accounting ambigu |

**Constat** : le montage **A** (bail unique + contacts) est le plus proche de la
**colocation « bail unique solidaire »** (le cas le plus courant en location nue)
et fonctionne déjà très bien avec la régularisation des charges (logement). Il te
manque juste le suivi **par colocataire** (part de loyer, qui a payé quoi).

Ton montage actuel (**C**) correspond plutôt aux **baux individuels** (fréquents
en meublé/étudiant) : chacun est indépendant, les paiements par personne marchent
déjà — mais il n'y a ni vue d'ensemble ni répartition automatique des charges
communes, et « fusionner » en un seul bail n'a pas de chemin prévu.

## Le cadre métier (colocation FR)

Deux régimes juridiques, qui n'appellent PAS le même modèle :

1. **Bail unique** (souvent avec **clause de solidarité**) : un seul contrat,
   les colocataires sont solidaires du loyer/charges. → modèle **A**.
2. **Baux individuels** : un contrat par colocataire (souvent une chambre + accès
   aux communs), le bailleur régularise/quittance chacun séparément. → modèle
   **C/D**.

La régularisation des charges se fait au niveau du **logement** puis se
**répartit** entre colocataires (à la quote-part : surface, nombre, ou parts
définies).

## Options d'amélioration (avec compromis)

### Option 1 — Documenter et s'appuyer sur le modèle A (peu/pas de code)
Faire de la colocation « bail unique » = 1 Tenant, le logement en bien unique,
colocataires en `contacts`. Charges/régularisation au niveau logement (déjà en
place).
- **+** quasi zéro dev, juridiquement le cas le plus courant, régul. naturelle.
- **–** pas de part de loyer ni de paiement par colocataire.

### Option 2 — Colocataires « première classe » sur un bail unique
Ajouter des **colocataires** au Tenant avec **part de loyer** et **imputation des
paiements par personne** (le loyer reste calculé au niveau logement, mais
balances/paiements ventilés par colocataire). Régularisation répartie
automatiquement.
- **+** vraie colocation solidaire avec suivi individuel, un seul bail, une seule
  régul. répartie.
- **–** **gros chantier** : touche le pipeline de loyer (paiements par personne),
  l'UI bailleur et l'app locataire (chacun voit sa part). Risque/coût élevés →
  **avec tests** obligatoires.

### Option 3 — « Groupe de colocation » reliant des baux individuels
Garder des Tenants par chambre mais les **relier** à un logement parent : vues
agrégées, **répartition automatique des charges communes** entre chambres,
documents partagés, gestion groupée.
- **+** colle aux **baux individuels**, paiements par personne déjà OK, ajoute la
  répartition des communes + l'agrégation.
- **–** deux modèles coexistent ; duplication logement/chambres ; dev modéré.

### Option 4 — Chambre = sous-bien d'un logement parent
Introduire une **hiérarchie bien parent → chambres** : les charges/dépenses
saisies au niveau logement se **répartissent aux chambres** (quote-part). Améliore
ton montage actuel sans changer la structure des baux.
- **+** rend le modèle par chambre propre (charges au bon niveau, réparties).
- **–** ne règle pas la bascule vers un bail unique ; ajoute une hiérarchie bien.

### Transverse — outil de conversion entre modèles
Quel que soit le choix, prévoir un **chemin de bascule** (ex. fusionner N
baux-chambres en un bail unique, ou l'inverse) pour éviter la ressaisie
destructive que tu subis aujourd'hui.

## Recommandation provisoire

- Si ta colocation est un **bail unique solidaire** → **Option 1** tout de suite
  (documenter + basculer sur le modèle A), puis **Option 2** si tu veux le suivi
  par colocataire.
- Si tu tiens aux **baux individuels par chambre** → **Option 3** (groupe) +
  éventuellement **Option 4** (répartition des charges communes).

À trancher ensemble avant dev (cf. questions ci-dessous).

## Questions ouvertes (à décider)

1. **Quel régime** pour ta colocation : bail unique solidaire, ou baux
   individuels par chambre ? (Ça oriente A/2 vs C/3/4.)
2. As-tu besoin d'un **suivi par colocataire** (part de loyer, qui a payé, relance
   individuelle, quittance individuelle) — ou un **seul loyer global** suffit ?
3. Les colocataires doivent-ils voir dans l'app locataire **leur part** ou **tout
   le logement** ?
4. Répartition des charges communes : **quote-part** (surface / nombre / parts
   définies) ? Fixe ou paramétrable par colocataire ?
5. La **bascule** entre montages doit-elle être outillée (migration), ou on choisit
   un modèle cible unique et on s'y tient ?
