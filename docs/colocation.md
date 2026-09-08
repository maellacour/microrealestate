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

## Décisions verrouillées

- **Régime** : baux **individuels par colocataire** (chacun son Tenant/loyer/
  paiements), **regroupés** → **Option 3**.
- **Bien** : **un seul bien = le logement**. Les chambres ne sont plus des biens
  séparés (au plus une info).
- **Quote-part** : **pourcentages saisis à la main** par colocataire, **défaut =
  parts égales (1/N)**.
- **Suivi par colocataire** : oui (loyer, paiements, relances, quittances) — déjà
  natif puisque baux séparés.
- **Charges communes** : saisies **une fois** au niveau logement/groupe, réparties
  à la quote-part dans la **régularisation de chaque colocataire**.
- **Conversion** : outil souhaité (voir plus bas) — non pour sauver l'historique
  (déjà sûr), mais pour éviter la ressaisie et créer le groupe + les %.

## Modèle cible

- **1 Property** = le logement. **N Tenants** (un par colocataire) rattachés au
  même logement. Une **collection `Colocation`** relie le logement et les membres
  `{ tenantId, sharePercent }`.
- Le **loyer reste calculé par Tenant** — le pipeline `1_base`→`7_total` n'est
  **pas** modifié.
- On rend « colocation-aware » les **agrégations au niveau bien** : occupation /
  statut (aujourd'hui basés sur `tenants[0]`) et le rapport « Résultats par bien »
  (N baux concurrents sur un même bien).

## Coût & risque

| Lot | Contenu | Effort | Risque |
|---|---|---|---|
| **A. Groupe + bien-logement unique** | collection `Colocation`, API CRUD, UI bailleur (créer/rattacher/%, vue agrégée), occupation + résultats par bien colocation-aware | **M–L** | **Moyen** (accounting/occupation par bien supposent un occupant unique) |
| **B. Charges communes à la quote-part** | saisie unique au niveau groupe → réparties par % dans la régularisation de chaque colocataire (réutilise la feature charges) | **M** | **Faible–Moyen** |
| **C. Outil de conversion** | repointe les baux chambre→logement, crée le groupe + %, préserve paiements/loyers ; idempotent + dump préalable | **S–M** | **Moyen** (migration de données) |

**Dé-risqueur clé** : le calcul du loyer n'est pas touché (chaque bail est
indépendant). On ne modifie que les agrégations au niveau bien et on **ajoute** le
groupe + la répartition des charges. **Vigilance** : plusieurs baux actifs sur un
même bien simultanément (occupation, « Résultats par bien ») → à rendre
colocation-aware **avec tests**. Ordre conseillé : **A → C → B**.

### Variante allégée du lot A
Sans collection dédiée : un **tag coloc + quote-part stockés sur chaque bail**
partageant le bien ; répartition calculée au moment de la régularisation. Effort A
réduit (**S–M**), risque moindre, mais pas de vraie vue agrégée.

## Conversion & historique

L'historique (loyers + **paiements**) est porté par le **Tenant**, pas par le bien.
Tant qu'on conserve les baux des colocataires, il est **préservé**.

**Décision de mise en œuvre** : plutôt qu'un script de migration bespoke (mutation
de données non testable en unitaire → risque), la conversion se fait par une
**procédure sûre réutilisant l'UI existante**, déjà éprouvée :

1. `mre dumpdb` (sauvegarde préalable).
2. Créer **le bien-logement** (Biens → nouveau bien = l'appartement).
3. Pour **chaque** bail-chambre : l'ouvrir → onglet **Bail** → remplacer le bien
   « chambre » par le bien « logement » → Enregistrer. Le loyer (sa part), les
   dates et les **paiements** restent sur le bail → historique **intact**.
4. Sur le bien-logement → onglet **Colocation** → **Créer une colocation** (elle
   agrège automatiquement les baux du logement) → ajuster les quote-parts.
5. (Optionnel) supprimer les anciens biens-chambres devenus vacants.
6. Vérifier soldes/paiements par colocataire.

Un endpoint de conversion automatique reste possible plus tard, mais il exige un
dump préalable et des tests d'intégration (mutation de `tenant.properties`).

## État d'implémentation

- **Lot A** (groupe + bien-logement + UI) : **fait**. Modèle pur (parts,
  répartition) testé ; le rapport « Résultats par bien » somme déjà correctement
  les revenus d'une colocation (chaque bail ne référence que le logement → poids
  1,0), donc **aucune refonte de l'accounting** n'a été nécessaire.
- **Lot B** (charges communes à la quote-part) : **fait** (endpoint
  `/colocations/:id/regularize` + UI ; réutilise la régularisation par
  colocataire).
- **Lot C** (conversion) : **procédure documentée** ci-dessus (pas de script
  risqué).
