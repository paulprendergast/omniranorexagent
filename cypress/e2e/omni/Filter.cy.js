/// <reference types="cypress" />
import { log } from 'winston';
import job from '../../fixtures/job.json';
import jobCompleted from '../../fixtures/jobCompleted.json';
import jobInProgress from '../../fixtures/jobInProgress.json';
import jobNotStarted from '../../fixtures/jobNotStarted.json';
import jobPaused from '../../fixtures/jobPaused.json';
import jobProcessing from '../../fixtures/jobProcessing.json';
import jobStopped from '../../fixtures/jobStopped.json';
const { processStates } = require('../../../src/states/process.states.cjs');

describe('Filter for the landing page',() => {

    beforeEach(()=> {
        Date.prototype.addSecs = function (s) {
          this.setSeconds(this.getSeconds() + s);
          return this;
        }
        cy.request('DELETE','/init');
      });
    before(() => {
        
       /// "byPassQueue": "false"
       /// "queueBehaviors": "false",
       ///"testDurationTime":"-timeout 180",
       ///"findPwshProcessDelay":61000,
       /// simulate.ps1: last 'Start-Sleep' in file -Seconds 15
    });
    after(() => {
        
    });
    afterEach(() => {
        
    });

    
    
    
    it('Basic order for status types', () => {
        cy.fixture('jobCompleted').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
          });
        cy.fixture('jobInProgress').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
          });
        cy.fixture('jobNotStarted').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
          });
        cy.fixture('jobPaused').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
          });
        cy.fixture('jobProcessing').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
          });
        cy.fixture('jobStopped').then((json) => {
            let newJob = json;                
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
          });

        cy.visit('/');

        //order by [processing,inProgress,notStarted,paused,stopped,completed]
        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 6);
        cy.getBySel('accordion-header').parent().find('h2').eq(0).contains(processStates.Processing);
        cy.getBySel('accordion-header').parent().find('h2').eq(1).contains(processStates.InProgress);
        cy.getBySel('accordion-header').parent().find('h2').eq(2).contains(processStates.NotStarted);
        cy.getBySel('accordion-header').parent().find('h2').eq(3).contains(processStates.Paused);
        cy.getBySel('accordion-header').parent().find('h2').eq(4).contains(processStates.Stopped);
        cy.getBySel('accordion-header').parent().find('h2').eq(5).contains(processStates.Completed);
    });

    it('Sorting on landing page for init_date', () => {  
        //order [processing,inProgress,notStarted,paused,stopped,completed]  
        cy.fixture('job').then((json) => {
          let newJob3 = json; 
          //26eb7fdcfc7ee7c6f99b869d
          newJob3[0].jobId  = newJob3[0].jobId.substring(0,23) + '1';    
          newJob3[0].status = processStates.NotStarted;        
          newJob3[0].init_date = new Date(Date.now()).toUTCString();
          cy.request('POST','/init', newJob3 );
        });
         cy.fixture('job').then((json) => {
          let newJob2 = json;    
          newJob2[0].jobId  = newJob2[0].jobId.substring(0,23) + '2';   
          newJob2[0].status = processStates.NotStarted;        
          newJob2[0].init_date = new Date(Date.now()).addSecs(1).toUTCString();
          cy.request('POST','/init', newJob2 );
        });
        cy.fixture('job').then((json) => {
          let newJob = json;
          newJob[0].jobId  = newJob[0].jobId.substring(0,23) + '3';       
          newJob[0].status = processStates.NotStarted;        
          newJob[0].init_date = new Date(Date.now()).addSecs(2).toUTCString();
          cy.request('POST','/init', newJob );
        }); 
        cy.visit('/');
        //first in is on top
        cy.getBySel('accordion-header').parent().find('h2').should('have.length', 3);
        cy.getBySel('accordion-header').parent().find('h2').eq(0).contains('26eb7fdcfc7ee7c6f99b8691');
        cy.getBySel('accordion-header').parent().find('h2').eq(1).contains('26eb7fdcfc7ee7c6f99b8692');
        cy.getBySel('accordion-header').parent().find('h2').eq(2).contains('26eb7fdcfc7ee7c6f99b8693');
      });

    it('Sorting with incorrect status type', () => {
        cy.fixture('job').then((json) => {
            let newJob = json;     
            newJob[0].status = 'Incomplete';        
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            cy.request('POST','/init', newJob );
            
          }); 
          cy.visit('/');
          cy.getBySel('accordion-header').should('not.exist');
    });

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