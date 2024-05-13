/// <reference types="cypress" />
import job from '../../fixtures/job.json';
const processStates = require('../../../src/states/process.states');



describe('Navigation to Apis', () => {

    beforeEach(() => {
      cy.request('DELETE','/init');
    });
    before(() => {});
    afterEach(() => {});
    after(() => {});

    it('Visit to root', () => {
        cy.visit('/');
        cy.getBySel('header-title').should('contain','Omni Ranorex Agent'); 
    });

    it('Perform Init DELETE and validate root page', () => {
        cy.getBySel('accordion-header').should('not.exist');
    });

    it('Perfrom Init DELETE verify Redirect', () => {
      cy.request({
          method: 'DELETE',  
          url: '/init',
          followRedirect: true, // turn on following redirects
      }).then((resp) => {
        // redirect status code is 302
        expect(resp.status).to.eq(200)
        expect(resp.redirectedToUrl).to.eq(undefined);
      });
    });

    it('Perform Init multiple GETs and validate root page', () => {
        //cy.request('/init');
        cy.request({
          url: '/init',
          followRedirect: true, // turn on following redirects
        }).then((resp) => {
          // redirect status code is 302
          expect(resp.status).to.eq(200)
        });
        cy.visit('/');
        cy.getBySel('accordion-header').should('exist');
        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 1);
        cy.request('/init');
        cy.visit('/');
        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 2);
    });

    it('Perform Init GET and validate children tests exist', () => {
        cy.request('/init');       
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('test-container').children().should('have.length', 4);
        cy.getBySel('test-container').children().should('not.have.length', 3);
        cy.getBySel('test-container').children().should('not.have.length', 5);
    });

    it('Perfrom Init GET verify Redirect', () => {
      cy.request({
          method: 'GET',  
          url: '/init',
          followRedirect: true, // turn on following redirects
      }).then((resp) => {
        // redirect status code is 302
        expect(resp.status).to.eq(200)
        expect(resp.redirectedToUrl).to.eq(undefined);
      });
    });


    it('Perform Init POST', () => {    
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
      });       
      cy.visit('/');
      cy.contains('div', 'Test Job:').should('be.visible').click();
      cy.getBySel('test-container').children().should('have.length', 4);
      cy.getBySel('test-container').children().should('not.have.length', 3);
      cy.getBySel('test-container').children().should('not.have.length', 5);
    });

    it('Perfrom Init POST verify Redirect', () => {
      cy.fixture('job')
        .then((json) => {
            let newJob = json;       
            newJob[0].status = 'Not Started';        
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request({
              method: 'POST',  
              url: '/init',
              followRedirect: true, // turn on following redirects
              body: newJob,
            }).then((resp) => {
              // redirect status code is 302
              expect(resp.status).to.eq(200)
              expect(resp.redirectedToUrl).to.eq(undefined);
            });
        });   
    });
 
});