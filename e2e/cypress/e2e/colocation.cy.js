import colocationProperty from '../fixtures/colocation_property.json';
import contract369 from '../fixtures/contract_369.json';
import i18n from '../support/i18n';
import roommates from '../fixtures/colocation_tenants.json';
import userWithCompanyAccount from '../fixtures/user_admin_company_account.json';

const t = i18n.getFixedT(userWithCompanyAccount.locale);

describe('Colocation', () => {
  before(() => {
    cy.resetAppData();
    cy.signUp(userWithCompanyAccount);
    cy.signIn(userWithCompanyAccount);
    cy.checkPage('firstaccess');
    cy.registerLandlord(userWithCompanyAccount);

    // a contract, the dwelling, and one lease per roommate on that dwelling
    cy.createContractFromStepper(contract369);
    cy.navAppMenu('dashboard');
    cy.addPropertyFromStepper(colocationProperty);
    cy.navAppMenu('dashboard');
    roommates.forEach((roommate) => {
      cy.addTenantFromStepper(roommate);
      cy.navAppMenu('dashboard');
    });
  });

  it('groups the roommate leases and sets their quote-parts', () => {
    cy.navAppMenu('properties');
    cy.openResource(colocationProperty.name);

    // Colocation tab: create the group from the leases renting this dwelling
    cy.get('[data-cy=tabColocation]').click();
    cy.get('[data-cy=createColocation]').click();

    // both roommates are grouped
    roommates.forEach((roommate) => {
      cy.contains(roommate.name).should('be.visible');
    });

    // set the quote-parts to 60 / 40
    cy.get('[data-cy=colocationShare0]').clear();
    cy.get('[data-cy=colocationShare0]').type('60');
    cy.get('[data-cy=colocationShare1]').clear();
    cy.get('[data-cy=colocationShare1]').type('40');
    cy.contains(`${t('Total share')}: 100%`).should('be.visible');

    cy.get('[data-cy=saveColocation]').click();

    // shares are persisted
    cy.reload();
    cy.get('[data-cy=tabColocation]').click();
    cy.get('[data-cy=colocationShare0]').should('have.value', '60');
    cy.get('[data-cy=colocationShare1]').should('have.value', '40');
  });
});
