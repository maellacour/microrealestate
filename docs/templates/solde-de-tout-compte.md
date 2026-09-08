# Modèle — Solde de tout compte (fin de bail)

Document de restitution du dépôt de garantie pour un bail d'habitation
(loi du 6 juillet 1989), à remettre au locataire à la sortie.

## Comment l'utiliser

Ce modèle n'est pas un template livré en base : les templates texte sont
propres à chaque organisation (realm) et se créent dans l'application.

1. Landlord → **Settings → Contract templates → New template** (type *Texte*).
2. Nommez-le « Solde de tout compte ».
3. Copiez-collez le texte ci-dessous dans l'éditeur.
4. Les `{{…}}` sont des variables : elles se remplissent automatiquement à la
   génération du document pour un locataire. Les variables de dépôt
   (`{{lease.depositRefund}}`, `{{lease.depositToRefund}}`,
   `{{lease.depositRefundDate}}`) ne sont renseignées qu'une fois la date de
   restitution saisie dans la section *Termination* de la fiche locataire.

Toutes les variables utilisées ici existent dans
`services/pdfgenerator/templates/fields.json`.

---

## Texte du modèle

**SOLDE DE TOUT COMPTE — RESTITUTION DU DÉPÔT DE GARANTIE**

Fait à {{current.location}}, le {{current.date}}.

**Entre les soussignés :**

Le bailleur, {{landlord.name}}, demeurant {{landlord.address.street1}}
{{landlord.address.street2}}, {{landlord.address.zipCode}}
{{landlord.address.city}},

Et le locataire, {{tenant.name}} ({{tenant.contacts.[0].name}}), pour le
logement situé {{properties.list.[0].address.street1}}
{{properties.list.[0].address.street2}}, {{properties.list.[0].address.zipCode}}
{{properties.list.[0].address.city}}.

**Rappel du bail**

- Référence du bail : {{lease.reference}}
- Date d'entrée : {{lease.beginDate}}
- Date de fin de bail : {{lease.terminationDate}}
- Dépôt de garantie versé à l'entrée : {{lease.deposit}}

**Décompte**

Conformément à l'article 22 de la loi n° 89-462 du 6 juillet 1989, le dépôt de
garantie est restitué au locataire, déduction faite le cas échéant des sommes
restant dues et du coût des réparations locatives constatées à l'état des lieux
de sortie.

- Dépôt de garantie : {{lease.deposit}}
- Montant restitué au locataire : {{lease.depositRefund}}
- Solde éventuel restant à restituer : {{lease.depositToRefund}}

**Restitution**

- Somme restituée le : {{lease.depositRefundDate}}
- Date limite légale de restitution : {{lease.depositRefundDueDate}}

Le dépôt de garantie doit être restitué dans un délai maximal de deux mois à
compter de la remise des clés par le locataire, ramené à un mois lorsque l'état
des lieux de sortie est conforme à l'état des lieux d'entrée.

Le présent document vaut solde de tout compte. Sauf sommes restant dues
mentionnées ci-dessus, les parties reconnaissent n'avoir plus aucune réclamation
l'une envers l'autre au titre du bail susvisé.

Fait en deux exemplaires.

Le bailleur,
{{landlord.name}}
{{landlord.signature}}

Le locataire,
{{tenant.contacts.[0].name}}
