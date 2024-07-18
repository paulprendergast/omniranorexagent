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

    beforeEach(()=> {
        cy.task('deleteAllDirectories');
        cy.request('DELETE','/init');
    });

    before(() => {
    
    /// File Default.json
    /// "byPassQueue": "true"
    /// "queueBehaviors": "false",
    ///"testDurationTime":"-timeout 180",
    ///"findPwshProcessDelay":61000,
    /// simulate.ps1: last 'Start-Sleep' in file -Seconds 15

    });
    after(() => {});
    afterEach(() => {});

    
    
    it('Single Happy Path for Processing', () =>{
        
        cy.fixture('shortJob1').then((json) => {
            let newJob = json;
            cy.request('POST','/init', newJob );
        });
        cy.visit('/');  
        //cy.wait(45000 + 61000 + (3 * 180000) + 30000);
        //cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cc');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 

        cy.wait(61000 + 25000); //61000 sec finding processId
        cy.visit('/'); 
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        }); 

        cy.wait(160000);//3min test1
        cy.visit('/');
        cy.contains('div', 'Test Job:').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        }); 
        cy.wait(5000);
    });

    it('Add HP1, wait 61 sec then Add HP2, HP1 finished then HP2 auto starts and Finished', () => {
        
        cy.fixture('shortJob1').then((json) => {
            let newJob = json;
            cy.request('POST','/init', newJob );
        });
        cy.visit('/');  
        //cy.wait(45000 + 61000 + (3 * 180000) + 30000);
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cc');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 

        cy.wait(61000); //61000 sec finding processId
        cy.fixture('shortJob2').then((json) => {
            let newJob = json;
            cy.request('POST','/init', newJob );
        });
        cy.visit('/');
        cy.getBySel('topResultRow1').should('be.visible').click();
        cy.getBySel('topResultRow1').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').eq(1).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(25000);
        cy.visit('/'); 
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        }); 

        cy.wait(160000);//3min test1
        cy.visit('/');
        cy.getBySel('topResultRow1').should('be.visible').click();
        cy.getBySel('testResult0').eq(1).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        });
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').eq(0).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(80000);
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').eq(0).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });

        cy.wait(90000);
        cy.visit('/');
        cy.getBySel('topResultRow1').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('topResultRow1').should('be.visible').click();
        cy.getBySel('testResult0').eq(1).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
        });

        cy.wait(5000);
    });

    it('Add HP1 and Add HP2 Immedately afterward HP1 finished HP2 does not start', () => {
        
        cy.fixture('shortJob1').then((json) => {
            let newJob = json;
            cy.request('POST','/init', newJob );
        });

        cy.wait(1000);
        cy.fixture('shortJob2').then((json) => {
            let newJob = json;
            cy.request('POST','/init', newJob );
        });
        cy.visit('/');
        cy.getBySel('topResultRow1').should('be.visible').click();
        cy.getBySel('topResultRow1').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').eq(1).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cc');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 



        cy.wait(25000);
        cy.visit('/'); 
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cc');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        }); 

        cy.wait(160000);//3min test1
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cc');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').eq(0).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            //expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
            expect($div.get(2).innerText).to.eq(processStates.InProgress);
        });
        cy.getBySel('topResultRow1').should('be.visible').click();
        cy.getBySel('topResultRow1').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').eq(1).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(40000);//3min test1
        cy.visit('/');
        cy.getBySel('topResultRow1').should('be.visible').click();
        cy.getBySel('topResultRow1').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cc');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').eq(1).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC12345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf(['Pass','Fail','Crash']);
            //expect($div.get(2).innerText).to.eq(processStates.InProgress);
        });
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b89cd');
            expect($p).to.contain(processStates.NotStarted);
        });
        cy.getBySel('testResult0').eq(0).find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC21345');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });
        cy.wait(5000);
    });

    it('Multiple Happy Path for Processing', () => {
        
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
            expect($div.get(1).innerText).to.eq(processStates.Finished);
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
        cy.wait(10000); // 10 sec for testjob to finish, because status comes early
    });

});