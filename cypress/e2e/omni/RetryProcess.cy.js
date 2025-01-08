/// <reference types="cypress" />
import retryOnOnlyTestNotStarted from '../../fixtures/retryOnOnlyTestNotStarted.json';
import retryOnOnlyTestInprogress from '../../fixtures/retryOnOnlyTestInprogress.json';
import retryInprogressLastTest from '../../fixtures/retryInprogressLastTest.json';
import retryCrashInMiddle from '../../fixtures/retryCrashInMiddle.json';
import retryCrashTwoCrashesInFront from '../../fixtures/retryCrashTwoCrashesInFront.json';
import retryCrashMultipleCrash from '../../fixtures/retryCrashMultipleCrash.json';
const { processStates } = require('../../../src/states/process.states.cjs');


describe('Retry test Processing', () => {

    beforeEach(()=> {
        cy.task('deleteAllDirectories');
        cy.request('DELETE','/all');
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

    ///
    // Start Happy Path make sure Sim Process was found; wait 90 sec.
    // then stop app and then start up again.
    // then run Auto Retry test only
    ///
    it('Crash on only test=NotStarted in Job',() => {
        cy.fixture('retryOnOnlyTestNotStarted').then((json) => {
            let newJob = json;
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            //Test's Init_date is set time before crash date inth Files/*log file. or test will not work.
            cy.request('POST','/init', newJob );
        });

        cy.wait(10000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });

    });

    it('Crash on only test=InProgress in Job',() => {
        cy.fixture('retryOnOnlyTestInprogress').then((json) => {
            let newJob = json;
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            //Test's Init_date is set time before crash date inth Files/*log file. or test will not work.
            cy.request('POST','/init', newJob );
        });

        cy.wait(10000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
    });

    it('Crash on last test in Job',() => {
        cy.fixture('retryInprogressLastTest').then((json) => {
            let newJob = json;
            newJob[0].init_date = new Date(Date.now()).toUTCString();
            //Test's Init_date is set time before crash date inth Files/*log file. or test will not work.
            cy.request('POST','/init', newJob );
        });

        cy.wait(10000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Fail]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
    });

    it('Crash on multiple tests in a row in Job in front',() => {
        cy.fixture('retryCrashTwoCrashesInFront').then((json) => {
            let newJob = json;
            const todayDate = new Date(Date.now());
            newJob[0].init_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,1,0,0).toUTCString();
            //Test's Init_date is set time before crash date inth Files/*log file. or test will not work.
            //crash happens around 00:33 am.
            //need to make first two test start time before crash for every day.
            newJob[0].process.init_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,10,0,0).toUTCString();
            newJob[0].testGroup[0].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,11,0,0).toUTCString();
            newJob[0].testGroup[0].finished_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,20,0,0).toUTCString();
            newJob[0].testGroup[1].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,22,0,0).toUTCString();
            cy.request('POST','/init', newJob );
        });

        cy.wait(10000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(90000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(120000);
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });

        cy.wait(190000);
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });  
    });

    

    it('Crash on middle test in small job',() => {
        cy.fixture('retryCrashInMiddle').then((json) => {
            let newJob = json;
            const todayDate = new Date(Date.now());
            newJob[0].init_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,1,0,0).toUTCString();
            //Test's Init_date is set time before crash date inth Files/*log file. or test will not work.
            //crash happens around 00:33 am.
            //need to make first two test start time before crash for every day.
            newJob[0].process.init_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,10,0,0).toUTCString();
            newJob[0].testGroup[0].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,11,0,0).toUTCString();
            newJob[0].testGroup[0].finished_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,20,0,0).toUTCString();
            newJob[0].testGroup[1].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,22,0,0).toUTCString();
            cy.request('POST','/init', newJob );
        });

        cy.wait(10000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(90000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(120000);
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });

        cy.wait(190000);
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });  
    });



    it('Support multiple crashes in job',() => {
        cy.fixture('retryCrashMultipleCrash').then((json) => {
            let newJob = json;
            const todayDate = new Date(Date.now());
            newJob[0].init_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,1,0,0).toUTCString();
            //Test's Init_date is set time before crash date inth Files/*log file. or test will not work.
            //crash happens around 00:33 am.
            //need to make first two test start time before crash for every day.
            newJob[0].process.init_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,10,0,0).toUTCString();
            newJob[0].testGroup[0].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,11,0,0).toUTCString();
            newJob[0].testGroup[0].finished_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,14,0,0).toUTCString();
            newJob[0].testGroup[1].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,15,0,0).toUTCString();
            newJob[0].testGroup[1].finished_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,18,0,0).toUTCString();
            newJob[0].testGroup[2].start_date = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDay(),0,22,0,0).toUTCString();
            cy.request('POST','/init', newJob );
        });

        cy.wait(10000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Fail]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.NotStarted);
            expect($div.get(2).innerText).to.be.oneOf([processStates.NotStarted]);
        });

        cy.wait(90000);
        cy.visit('/');

        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.InProgress);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Fail]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.InProgress);
            expect($div.get(2).innerText).to.be.oneOf([processStates.InProgress]);
        });

        cy.wait(115000);
        cy.visit('/');
        cy.getBySel('topResultRow0').should('be.visible').click();
        cy.getBySel('topResultRow0').should(($p) => {
            expect($p).to.contain('83eb7fdcfc7ee7c6f99b8610');
            expect($p).to.contain(processStates.Completed);
        });
        cy.getBySel('testResult0').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13345');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult1').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13346');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Fail]);
        });
        cy.getBySel('testResult2').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13347');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Crash]);
        });
        cy.getBySel('testResult3').find('div').should($div => {
            expect($div.get(0).innerText).to.eq('TC13348');
            expect($div.get(1).innerText).to.eq(processStates.Finished);
            expect($div.get(2).innerText).to.be.oneOf([processStates.Pass, processStates.Fail]);
        });

    });

    

});

