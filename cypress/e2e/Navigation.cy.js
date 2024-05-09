/// <reference types="cypress" />
import job from '../fixtures/job.json';



describe('Navigation to Apis', () => {
    beforeEach(()=> {
      Date.prototype.addSecs = function (s) {
        this.setSeconds(this.getSeconds() + s);
        return this;
      }
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
        cy.request('DELETE','/init');
        cy.visit('/');
        cy.getBySel('accordion-header').should('not.exist');
    });

    it('Perform Init multiple GETs and validate root page', () => {
        cy.request('DELETE','/init');
        cy.request('/init');       
        cy.visit('/');
        cy.getBySel('accordion-header').should('exist');
        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 1);
        cy.request('/init');
        cy.visit('/');
        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 2);
    });

    it('Perform Init GET and validate children tests exist', () => {
        cy.request('DELETE','/init');
        cy.request('/init');       
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('test-container').children().should('have.length', 4);
        cy.getBySel('test-container').children().should('not.have.length', 3);
        cy.getBySel('test-container').children().should('not.have.length', 5);
    });

    it('Perform Init POST', () => {
      cy.request('DELETE','/init');      
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = 'Not Started';        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
      });       
      cy.visit('/');
      cy.contains('div', 'Test Job:').should('be.visible').click();
      cy.getBySel('test-container').children().should('have.length', 4);
      cy.getBySel('test-container').children().should('not.have.length', 3);
      cy.getBySel('test-container').children().should('not.have.length', 5);
    });

    it('Visit to root Sorting', () => {
      cy.request('DELETE','/init');     
      cy.fixture('job').then((json) => {
        let newJob3 = json;        
        newJob3[0].status = 'Not Started3';        
        newJob3[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob3 );
      });
       cy.fixture('job').then((json) => {
        let newJob2 = json;       
        newJob2[0].status = 'Not Started2';        
        newJob2[0].init_date = new Date(Date.now()).addSecs(1).toUTCString();
        cy.request('POST','/init', newJob2 );
      });
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = 'Not Started1';        
        newJob[0].init_date = new Date(Date.now()).addSecs(2).toUTCString();
        cy.request('POST','/init', newJob );
      }); 
      cy.visit('/');
      cy.getBySel('accordion-header').parent().find('h2').should('have.length', 3);
      cy.getBySel('accordion-header').parent().find('h2').eq(0).contains('Not Started1');
      cy.getBySel('accordion-header').parent().find('h2').eq(1).contains('Not Started2');
      cy.getBySel('accordion-header').parent().find('h2').eq(2).contains('Not Started3');
    });
});