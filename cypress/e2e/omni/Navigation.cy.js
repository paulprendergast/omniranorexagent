/// <reference types="cypress" />
import job from '../../fixtures/job.json';
const {processStates} = require('../../../src/states/process.states.cjs');



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

    it.skip('Perfrom Init DELETE verify Redirect', () => {
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

    it.skip('Perform Init multiple GETs and validate root page', () => {
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

    it.skip('Perform Init GET and validate children tests exist', () => {
        cy.request('/init');       
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('test-container').children().should('have.length', 4);
        cy.getBySel('test-container').children().should('not.have.length', 3);
        cy.getBySel('test-container').children().should('not.have.length', 5);
    });

    it.skip('Perfrom Init GET verify Redirect', () => {
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


    it('Perform Init POST and validate children tests exist', () => {    
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

    it('Multiple POST and validate children tests exist', () => {    
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
      });    
      
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
      });   
      cy.visit('/');
      cy.contains('div', 'Test Job:').should('be.visible').click();
      cy.getBySel('test-container').children().should('have.length', 8);
    });

    it.skip('Perfrom Init POST verify Redirect', () => {
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

    it('Match jobId on screen by GET request', () => {    
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );      
      });       
      cy.visit('/');
      cy.getBySel('strongJobId').should('exist');
      cy.getBySel('strongJobId').should('have.length', 1);
      cy.getBySel('strongJobId').contains('26eb7fdcfc7ee7c6f99b869d');
      cy.request('GET', '/init/?jobId=26eb7fdcfc7ee7c6f99b869d').then(res => {
        expect(res.body.jobId).contain('26eb7fdcfc7ee7c6f99b869d')
      });
    });

    it(' GET All request', () => {    
      cy.fixture('job').then((json) => {
        let newJob = json;
        newJob[0].jobId  = newJob[0].jobId.substring(0,23) + '1';       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
      });    
      
      cy.fixture('job').then((json) => {
        let newJob = json;
        newJob[0].jobId  = newJob[0].jobId.substring(0,23) + '2';       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
      });     
      cy.visit('/');
      //cy.getBySel('strongJobId').should('exist');
      //cy.getBySel('strongJobId').should('have.length', 1);
      //cy.getBySel('strongJobId').contains('26eb7fdcfc7ee7c6f99b869d');
      cy.request('GET', '/init/all').then(res => {
        console.log('res.body');
        console.log(res);
        expect(Cypress._.find(res.body,'26eb7fdcfc7ee7c6f99b8691')).is.not.null;
        expect(Cypress._.find(res.body,'26eb7fdcfc7ee7c6f99b8692')).is.not.null;
        expect(Cypress._.find(res.body,'26eb7fdcfc7ee7c6f99b8693')).is.undefined;
      });
    });

    it('Alter Job on Screate Request PUT', () => {    
      cy.fixture('job').then((json) => {
        let newJob = json;       
        newJob[0].status = processStates.NotStarted        
        newJob[0].init_date = new Date(Date.now()).toUTCString();
        cy.request('POST','/init', newJob );
        cy.visit('/');  
        cy.getBySel('accordion-header').parent().find('h2').eq(0).contains(processStates.NotStarted)
        cy.request({
          method: 'PUT',
          url: '/init?jobId=26eb7fdcfc7ee7c6f99b869d',
          form: true,
          body: {
            status: "InProgress"
          }
        });    
      });       
      cy.visit('/');
      cy.getBySel('accordion-header').parent().find('h2').eq(0).contains(processStates.InProgress);
    });

    
 
});