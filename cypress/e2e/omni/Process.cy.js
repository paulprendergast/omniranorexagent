/// <reference types="cypress" />
import job from '../../fixtures/job.json';
import jobCompleted from '../../fixtures/jobCompleted.json';
import jobInProgress from '../../fixtures/jobInProgress.json';
import jobNotStarted from '../../fixtures/jobNotStarted.json';
import jobPaused from '../../fixtures/jobPaused.json';
import jobProcessing from '../../fixtures/jobProcessing.json';
import jobStopped from '../../fixtures/jobStopped.json';
const { processStates } = require('../../../src/states/process.states.cjs');


describe('Processing', () => {

    beforeEach(()=> {});

    before(() => {
    
    /// File Default.json
    /// "byPassQueue": "true"
    /// "queueBehaviors": "false",

    });
    after(() => {});
    afterEach(() => {});

    it.only('Happy Path for Processing', () => {
        cy.task('deleteAllDirectories');
        cy.request('DELETE','/init');
        
        cy.fixture('processJob1').then((json) => {
            let newJob = json;
            cy.request('POST','/init', newJob );
        });
        cy.visit('/');  
        //cy.wait(45000 + 61000 + (3 * 180000) + 30000);
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b899c');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });
        cy.wait(45000); //45000 sec before job/worker starts
        cy.visit('/');  
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b899c');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });


        cy.wait(61000); //61000 sec finding processId
        cy.visit('/'); 
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });
        cy.wait(180000);//3min test1
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 
        cy.wait(180000);//3min test2
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });
        cy.wait(180000);//3min test3
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        /* cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });  */
        cy.wait(30000); //extra sec
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC67890');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13579');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
    });

    it('TestJob1 finished then TestJob2 auto starts', () => {
        //cy.task('deleteAllDirectories');
        //cy.request('DELETE','/init');
    });

    ///
    // Start Happy Path make sure Sim Process was found; wait 90 sec.
    // then stop app and then start up again.
    // then run Auto Retry test only
    ///
    it.skip('Auto Retry after app crash',() => {});
});