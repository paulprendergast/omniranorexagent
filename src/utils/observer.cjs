var config = require('config');
const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const fsExtra = require('fs-extra');
const dbUtilities = require('./dbUtilities.cjs');
const utilities = require('./utilities.cjs');
const { processStates } = require('../states/process.states.cjs');
const { logger } = require("./logger.cjs");

class Observer extends EventEmitter {

    constructor(folder) {
        super();
        this.watcher = chokidar.watch(folder, { persistent: true });
    }

    watchFolder() {
        try {
            this.watcher.on('addDir', async path => {
                if (path.includes('TC')) {
                  logger.info(`WATCHER: Directory ${path} has been added`);
                  //Get DB-TestJOb
                  //if first test matches DB-TestJob-First-Test, then start timeout-do for fetching Sim ProcessID
                  let testJob = await dbUtilities.findInProgressTestJob();
                  testJob = testJob.job;
                  const jobId = JSON.stringify(testJob.jobId).replace('\"','').replace('\"','');
                  let foundTest = path.split('-');
                  foundTest = foundTest[0];
                  foundTest = foundTest.split('/');
                  foundTest = foundTest[1];
                  //
                  
                  if( testJob.process.id === null && foundTest === testJob.testGroup[0].testId
                     && testJob.testGroup[0].workStatus === processStates.NotStarted){
                      
                      logger.info(`WATCHER: Finding ProcessId with manditory delay:  ${config.get('findPwshProcessDelay')/1000} sec.`);
                      testJob = await utilities.getCommandLineProcessId(jobId);
                      logger.info(`WATCHER: Finding and saving ProcessId = ${testJob.process.id}.`);
                  }
              
                  await utilities.watchFolderStatusAndUpdate(jobId, testJob);
                }
              });
            this.watcher.on('error', error => logger.error(`WATCHER: error: ${error}`));
            this.watcher.on('ready', () => logger.info('WATCHER: Initial scan complete. Ready for changes'));
        } catch (error) {
          console.log(error);
        }
      }
      watchClose() {
        this.watcher.close().then(() => {logger.info('closed watcher');});
      }
}

module.exports = Observer;