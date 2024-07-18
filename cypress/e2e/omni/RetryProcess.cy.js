/// <reference types="cypress" />
import job from '../../fixtures/job.json';
import jobCompleted from '../../fixtures/jobCompleted.json';
import jobInProgress from '../../fixtures/jobInProgress.json';
import jobNotStarted from '../../fixtures/jobNotStarted.json';
import jobPaused from '../../fixtures/jobPaused.json';
import jobProcessing from '../../fixtures/jobProcessing.json';
import jobStopped from '../../fixtures/jobStopped.json';
const { processStates } = require('../../../src/states/process.states.cjs');
const { psStartApp } = require('../../../src/utils/powershellTools.cjs')


describe('Processing', () => {

    beforeEach(()=> {
      
        //cy.task('deleteAllDirectories');
        //cy.request('DELETE','/init');
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
    it('Auto Retry after app crash',() => {});

});