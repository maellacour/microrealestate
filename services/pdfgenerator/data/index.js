import { Collections, logger, Service } from '@microrealestate/common';
import fs from 'fs-extra';
import moment from 'moment';
import path from 'path';
import { sanitize } from '../src/utils/index.js';

export async function getRentsData(params) {
  const { id: tenantId, term } = params;

  let dbTenant;
  try {
    dbTenant = await Collections.Tenant.findOne({ _id: tenantId })
      .populate('realmId')
      .populate('leaseId')
      .populate('properties.propertyId');
  } catch (error) {
    logger.error(error);
  }
  if (!dbTenant) {
    throw new Error(`tenant ${tenantId} not found`);
  }

  const landlord = dbTenant.realmId;
  landlord.name =
    (landlord.isCompany
      ? landlord.companyInfo?.name
      : landlord.contacts?.[0]?.name) || '';
  landlord.hasCompanyInfo = !!landlord.companyInfo;
  landlord.hasBankInfo = !!landlord.bankInfo;
  landlord.hasAddress = !!landlord.addresses?.length;
  landlord.hasContact = !!landlord.contacts?.length;
  landlord.hasSignature = !!landlord.signature;
  if (landlord.signature) {
    // Create the signature file URL for EJS templates (similar to logo)
    const { UPLOADS_DIRECTORY } = Service.getInstance().envConfig.getValues();
    const signaturePath = path.join(UPLOADS_DIRECTORY, landlord.signature);

    // Check if signature file exists and embed as base64 data URL
    // (fileUrl/file:// URLs are blocked by modern Chromium cross-directory policy)
    if (fs.existsSync(signaturePath)) {
      const ext = path.extname(signaturePath).toLowerCase().slice(1);
      const mimeTypes = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        svg: 'image/svg+xml'
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      const imageBuffer = fs.readFileSync(signaturePath);
      landlord.signatureUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } else {
      logger.warn(`Signature file not found: ${signaturePath}`);
      landlord.hasSignature = false;
    }
  }

  let rents = [];
  if (dbTenant.rents.length) {
    rents = dbTenant.rents
      .filter((rent) => String(rent.term).startsWith(term))
      .map((rent) => ({
        ...rent,
        period: rent.term,
        billingReference: `${moment(rent.term, 'YYYYMMDDHH').format('MM_YY_')}${
          dbTenant.reference
        }`,
        total: {
          ...rent.total,
          payment: rent.total.payment || 0,
          subTotal:
            rent.total.preTaxAmount +
            rent.total.charges -
            rent.total.discount +
            rent.total.debts,
          newBalance: rent.total.grandTotal - rent.total.payment
        }
      }));
  }

  const tenant = {
    name: dbTenant.isCompany ? dbTenant.company : dbTenant.name,
    isCompany: dbTenant.isCompany,
    companyInfo: {
      name: dbTenant.company,
      capital: dbTenant.capital,
      ein: dbTenant.siret,
      dos: dbTenant.rcs,
      vatNumber: dbTenant.vatNumber,
      legalRepresentative: dbTenant.manager
    },
    addresses: [
      {
        street1: dbTenant.street1,
        street2: dbTenant.street2,
        city: dbTenant.city,
        state: dbTenant.state,
        country: dbTenant.country
      }
    ],
    contract: {
      name: dbTenant.contract,
      lease: dbTenant.leaseId,
      beginDate: dbTenant.beginDate,
      endDate: dbTenant.endDate,
      properties: dbTenant.properties.reduce((acc, { propertyId }) => {
        acc.push(propertyId);
        return acc;
      }, [])
    },
    rents
  };
  if (dbTenant.terminationDate) {
    tenant.contract.terminationDate = dbTenant.terminationDate;
  }

  return {
    fileName: sanitize(`${dbTenant.name}-${term}`),
    tenant,
    landlord
  };
}

export function avoidWeekend(aMoment) {
  const day = aMoment.isoWeekday();
  if (day === 6) {
    // if saturday shift the due date to friday
    aMoment.subtract(1, 'days');
  } else if (day === 7) {
    // if sunday shift the due date to friday
    aMoment.subtract(2, 'days');
  }
  return aMoment;
}
