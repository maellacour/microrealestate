/* eslint-env node */
/*
 * Seed a clean, "particulier" (individual French landlord) demo dataset.
 *
 * Destination in the repo: services/api/scripts/seed-demo.js
 *
 * Run it against the demo database, then dump it over backup/demodb.dump:
 *   MONGO_URL=mongodb://localhost:27017/demodb node services/api/scripts/seed-demo.js
 *   (inside the api dev container MONGO_URL is already set)
 *   yarn mre dumpdb   # then rename the produced backup to backup/demodb.dump
 *
 * Rents and payments are generated through the real Contract business logic, so
 * every payment falls inside its contract window (no "payments out of frame").
 */
import * as Contract from '../src/managers/contract.js';
import { Collections } from '@microrealestate/common';
import moment from 'moment';
import mongoose from 'mongoose';

const round = (v) => Math.round((v || 0) * 100) / 100;
const dmy = (d) => moment(d).format('DD/MM/YYYY');
const termOf = (d) => Number(moment(d).startOf('month').format('YYYYMMDDHH'));

// "today" for the demo — a few unpaid recent terms make it realistic.
const NOW = moment('2026-09-15');

async function main() {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/demodb';
  await mongoose.connect(MONGO_URL);
  const { Account, Realm, Property, Lease, Tenant, Colocation } = Collections;

  await Promise.all(
    [Account, Realm, Property, Lease, Tenant, Colocation].map((m) =>
      m.deleteMany({})
    )
  );
  if (Collections.ChargeRegularization) {
    await Collections.ChargeRegularization.deleteMany({});
  }

  const EMAIL = 'demo@demo.com';

  // 1) landlord login (password hashed by the Account pre-save hook)
  await new Account({
    firstname: 'Marie',
    lastname: 'Lacour',
    email: EMAIL,
    password: 'demo'
  }).save();

  // 2) the organization — an individual landlord (isCompany = false)
  const realm = await new Realm({
    name: 'Marie Lacour',
    members: [
      {
        name: 'Marie Lacour',
        email: EMAIL,
        role: 'administrator',
        registered: true
      }
    ],
    addresses: [
      {
        street1: '18 rue des Lilas',
        zipCode: '44000',
        city: 'Nantes',
        state: '',
        country: 'France'
      }
    ],
    bankInfo: {
      name: 'Crédit Mutuel',
      iban: 'FR76 3000 4000 5000 6000 7000 189'
    },
    contacts: [
      { name: 'Marie Lacour', email: EMAIL, phone1: '0611223344', phone2: '' }
    ],
    isCompany: false,
    locale: 'fr-FR',
    currency: 'EUR'
  }).save();
  const realmId = String(realm._id);

  // 3) properties (varied, plus one vacant)
  const mkProperty = (p) =>
    new Property({ realmId, ...p, createdDate: new Date() }).save();

  const studioParis = await mkProperty({
    type: 'apartment',
    name: 'Studio — Paris 11e',
    description: 'Studio 26 m², rue de la Roquette',
    surface: 26,
    digicode: 'A2431',
    address: {
      street1: '42 rue de la Roquette',
      zipCode: '75011',
      city: 'Paris',
      state: '',
      country: 'France'
    },
    price: 780
  });
  const t2Lyon = await mkProperty({
    type: 'apartment',
    name: 'T2 — Lyon Croix-Rousse',
    description: 'T2 48 m² avec balcon',
    surface: 48,
    address: {
      street1: '9 rue Jacquard',
      zipCode: '69004',
      city: 'Lyon',
      state: '',
      country: 'France'
    },
    price: 690
  });
  const maisonNantes = await mkProperty({
    type: 'house',
    name: 'Maison — Nantes Doulon',
    description: 'Maison 4 pièces avec jardin',
    surface: 92,
    address: {
      street1: '3 impasse des Cerisiers',
      zipCode: '44300',
      city: 'Nantes',
      state: '',
      country: 'France'
    },
    price: 1080
  });
  const colocToulouse = await mkProperty({
    type: 'apartment',
    name: 'Colocation — Toulouse Capitole',
    description: 'Grand T4 loué en colocation (3 chambres)',
    surface: 95,
    address: {
      street1: '12 rue du Taur',
      zipCode: '31000',
      city: 'Toulouse',
      state: '',
      country: 'France'
    },
    price: 1200
  });
  const garageParis = await mkProperty({
    type: 'parking',
    name: 'Garage — Paris 11e',
    description: 'Box fermé',
    surface: 12,
    address: {
      street1: '42 rue de la Roquette',
      zipCode: '75011',
      city: 'Paris',
      state: '',
      country: 'France'
    },
    price: 130
  });
  // vacant — intentionally never rented
  await mkProperty({
    type: 'apartment',
    name: 'T3 — Bordeaux (vacant)',
    description: 'T3 en cours de mise en location',
    surface: 62,
    address: {
      street1: '5 cours de la Marne',
      zipCode: '33000',
      city: 'Bordeaux',
      state: '',
      country: 'France'
    },
    price: 850
  });

  // 4) contracts (leases)
  const mkLease = (l) =>
    new Lease({ realmId, active: true, ...l, stepperMode: false }).save();
  const bailNu = await mkLease({
    name: 'Bail nu 3 ans',
    description: 'Location vide, loi du 6 juillet 1989 — 3 ans, préavis 3 mois',
    numberOfTerms: 36,
    timeRange: 'months'
  });
  const bailMeuble = await mkLease({
    name: 'Bail meublé 1 an',
    description: 'Location meublée — 1 an reconductible',
    numberOfTerms: 12,
    timeRange: 'months'
  });
  await mkLease({
    name: 'Location garage',
    description: 'Emplacement de stationnement',
    numberOfTerms: 12,
    timeRange: 'months'
  });

  // helper: build a tenant with rents computed by the real pipeline, then pay
  // the requested terms in chronological order.
  async function mkTenant({
    name,
    reference,
    lease,
    property,
    rent,
    expenses = 0,
    begin,
    end,
    contacts,
    chargesMode = 'provisions',
    guaranty = 0,
    payUntil,
    skipTerms = [],
    partialTerms = {},
    terminationDate = null,
    guarantyPayback = 0,
    guarantyPaybackDate = null
  }) {
    const snapshot = property.toObject ? property.toObject() : property;
    const properties = [
      {
        propertyId: String(property._id),
        property: snapshot,
        rent,
        expenses: expenses
          ? [{ title: 'Provision pour charges', amount: expenses }]
          : [],
        entryDate: moment(begin).toDate(),
        exitDate: moment(end).toDate()
      }
    ];

    const contract = Contract.create({
      frequency: 'months',
      begin: dmy(begin),
      end: dmy(end),
      discount: 0,
      vatRate: 0,
      properties
    });

    const perTerm = round(rent + expenses);
    const payCutoff = payUntil ? moment(payUntil).endOf('month') : null;
    if (payCutoff) {
      contract.rents
        .map((r) => r.term)
        .filter((term) => {
          const m = moment(String(term), 'YYYYMMDDHH');
          return m.isSameOrBefore(payCutoff) && !skipTerms.includes(term);
        })
        .forEach((term) => {
          const amount =
            partialTerms[term] !== undefined ? partialTerms[term] : perTerm;
          if (amount <= 0) {
            return;
          }
          Contract.payTerm(contract, term, {
            payments: [
              {
                date: moment(String(term), 'YYYYMMDDHH')
                  .date(3)
                  .format('DD/MM/YYYY'),
                amount,
                type: 'transfer',
                reference: `VIR-${String(term).slice(0, 6)}`,
                description: ''
              }
            ],
            debts: [],
            discounts: [],
            description: ''
          });
        });
    }

    return new Tenant({
      realmId,
      name,
      isCompany: false,
      street1: snapshot.address?.street1,
      zipCode: snapshot.address?.zipCode,
      city: snapshot.address?.city,
      country: 'France',
      contacts,
      reference,
      contract: lease.name,
      leaseId: String(lease._id),
      frequency: 'months',
      beginDate: moment(begin).toDate(),
      endDate: moment(end).toDate(),
      terminationDate: terminationDate
        ? moment(terminationDate).toDate()
        : undefined,
      properties,
      rents: contract.rents,
      isVat: false,
      vatRatio: 0,
      discount: 0,
      guaranty,
      guarantyPayback,
      guarantyPaybackDate: guarantyPaybackDate
        ? moment(guarantyPaybackDate).toDate()
        : undefined,
      chargesMode,
      stepperMode: false
    }).save();
  }

  // T1 — up to date, provisions
  await mkTenant({
    name: 'Camille Durand',
    reference: 'PARIS-STUDIO-01',
    lease: bailNu,
    property: studioParis,
    rent: 780,
    expenses: 55,
    begin: '2024-01-01',
    end: '2026-12-31',
    contacts: [
      {
        name: 'Camille Durand',
        email: 'camille.durand@example.fr',
        phone: '0620304050'
      }
    ],
    guaranty: 780,
    payUntil: NOW.clone().subtract(1, 'month')
  });

  // T2 — two late terms
  await mkTenant({
    name: 'Lucas Petit',
    reference: 'LYON-T2-02',
    lease: bailNu,
    property: t2Lyon,
    rent: 690,
    expenses: 60,
    begin: '2023-09-01',
    end: '2026-08-31',
    contacts: [
      {
        name: 'Lucas Petit',
        email: 'lucas.petit@example.fr',
        phone: '0631415161'
      }
    ],
    guaranty: 690,
    payUntil: NOW,
    skipTerms: [termOf('2026-07-01'), termOf('2026-08-01')]
  });

  // T3 — forfait charges, partial last payment
  await mkTenant({
    name: 'Emma Moreau',
    reference: 'NANTES-MAISON-03',
    lease: bailMeuble,
    property: maisonNantes,
    rent: 1080,
    expenses: 90,
    begin: '2025-06-01',
    end: '2026-05-31',
    contacts: [
      {
        name: 'Emma Moreau',
        email: 'emma.moreau@example.fr',
        phone: '0642526272'
      }
    ],
    chargesMode: 'forfait',
    guaranty: 2160,
    payUntil: '2026-05-01',
    partialTerms: { [termOf('2026-05-01')]: 600 }
  });

  // T4 — terminated lease, deposit refunded
  await mkTenant({
    name: 'Hugo Bernard',
    reference: 'PARIS-GARAGE-04',
    lease: bailMeuble,
    property: garageParis,
    rent: 130,
    expenses: 0,
    begin: '2024-03-01',
    end: '2025-02-28',
    terminationDate: '2025-02-28',
    contacts: [
      {
        name: 'Hugo Bernard',
        email: 'hugo.bernard@example.fr',
        phone: '0653637383'
      }
    ],
    guaranty: 130,
    guarantyPayback: 130,
    guarantyPaybackDate: '2025-03-15',
    payUntil: '2025-02-01'
  });

  // T5 + T6 — colocation on the Toulouse dwelling (two individual leases)
  const lea = await mkTenant({
    name: 'Léa Martin',
    reference: 'TLS-COLOC-05',
    lease: bailMeuble,
    property: colocToulouse,
    rent: 430,
    expenses: 40,
    begin: '2025-09-01',
    end: '2026-08-31',
    contacts: [
      {
        name: 'Léa Martin',
        email: 'lea.martin@example.fr',
        phone: '0664748494'
      }
    ],
    guaranty: 430,
    payUntil: NOW.clone().subtract(1, 'month')
  });
  const nathan = await mkTenant({
    name: 'Nathan Roux',
    reference: 'TLS-COLOC-06',
    lease: bailMeuble,
    property: colocToulouse,
    rent: 390,
    expenses: 40,
    begin: '2025-09-01',
    end: '2026-08-31',
    contacts: [
      {
        name: 'Nathan Roux',
        email: 'nathan.roux@example.fr',
        phone: '0675859505'
      }
    ],
    guaranty: 390,
    payUntil: NOW,
    skipTerms: [termOf('2026-08-01')]
  });

  await new Colocation({
    realmId,
    propertyId: String(colocToulouse._id),
    name: 'Colocation Capitole',
    members: [
      { tenantId: String(lea._id), sharePercent: 52.44 },
      { tenantId: String(nathan._id), sharePercent: 47.56 }
    ],
    createdDate: new Date(),
    updatedDate: new Date()
  }).save();

  if (Collections.ChargeRegularization) {
    const t1 = await Tenant.findOne({ reference: 'PARIS-STUDIO-01' });
    await new Collections.ChargeRegularization({
      realmId,
      tenantId: String(t1._id),
      periodStart: moment('2025-01-01').toDate(),
      periodEnd: moment('2025-12-31').toDate(),
      lines: [
        {
          label: 'Charges de copropriété récupérables',
          amount: 520,
          recoverable: true
        },
        {
          label: 'Taxe ordures ménagères (TEOM)',
          amount: 180,
          recoverable: true
        },
        { label: 'Eau froide', amount: 140, recoverable: true },
        { label: 'Taxe foncière', amount: 950, recoverable: false }
      ],
      note: 'Régularisation annuelle 2025.',
      shared: true,
      createdDate: new Date(),
      updatedDate: new Date()
    }).save();
  }

  const counts = {
    properties: await Property.countDocuments({ realmId }),
    leases: await Lease.countDocuments({ realmId }),
    tenants: await Tenant.countDocuments({ realmId }),
    colocations: await Colocation.countDocuments({ realmId })
  };
  // eslint-disable-next-line no-console
  console.log('Seed complete:', counts);

  await mongoose.disconnect();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
