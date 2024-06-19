/// <reference types="cypress" />
import job from '../../fixtures/job.json';
import jobCompleted from '../../fixtures/jobCompleted.json';
import jobInProgress from '../../fixtures/jobInProgress.json';
import jobNotStarted from '../../fixtures/jobNotStarted.json';
import jobPaused from '../../fixtures/jobPaused.json';
import jobProcessing from '../../fixtures/jobProcessing.json';
import jobStopped from '../../fixtures/jobStopped.json';
const { processStates } = require('../../../src/states/process.states.cjs');


describe('Testing the Process selection', () => {

    beforeEach(()=> {
        Date.prototype.addSecs = function (s) {
          this.setSeconds(this.getSeconds() + s);
          return this;
        }
        cy.request('DELETE','/init');
      });
    before(() => {});
    after(() => {});
    afterEach(() => {});

    it('First TestJob in jobs table', () => {

        cy.fixture('jobNotStarted').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            newJob[0].testmode.enabled = 'true';
            cy.request('POST','/init', newJob );
        });
        cy.visit('/');

        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 1);
        cy.getBySel('accordion-header').parent().find('h2').eq(0).contains(processStates.NotStarted);
        
    });


});