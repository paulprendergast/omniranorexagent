var config = require('config');
const { default: mongoose } = require('mongoose');
const _ = require('lodash');
const db = require('./db.cjs');
const redisOptions = { host: "localhost", port: config.get('redisPort') };
const moment = require("moment");
const momentz = require("moment-timezone");
const dbUtilities = require('./dbUtilities.cjs');
const utilities = require('./utilities.cjs');
const node = require('timers/promises');
const fs = require('node:fs');
const path = require('node:path');
const fsPromises = require('node:fs/promises');
const chokidar = require('chokidar');
const observer = require('./observer.cjs');
const { jobSchema } = require('../models/job.cjs');
const { Queue, Worker, tryCatch } = require("bullmq");
const { psGetProcess, psSimulate } = require('./powershellTools.cjs');
const { processStates } = require('../states/process.states.cjs');
const { logger } = require("./logger.cjs");
const { PowerShell } = require("node-powershell");
//const { Observable, observeOn, asyncScheduler } = require("rxjs");
let watcher = new observer('./logs');

const QueueOptions = {
  delay: 5000,
  attempts: 0,
  backoff: 0,
  removeOnComplete: true,
  removeOnFail: true 
};
const QueueOptions2 = {
  delay: 7000,
  attempts: 0,
  backoff: 0,
  removeOnComplete: true,
  removeOnFail: true 
};
const testJobQueue = new Queue("testJobQueue", { connection: redisOptions });
const stopJobQueue = new Queue("stopJobQueue", { connection: redisOptions });


let testJobData = { 
  name: 'testJob',
  jobData:[]
};

let trackJobData = { 
  name: 'testTracker',
  jobData:[]
};


async function addTestJobToQueue() {
  try {
    logger.info('looking for jobs');
    let foundJobs = await dbUtilities.findAll()   
    const notStarted = _.filter(foundJobs, {'status': processStates.NotStarted});
    const processing = _.filter(foundJobs, {'status': processStates.Processing});
    const inProgress = _.filter(foundJobs, {'status': processStates.InProgress});
    
    //only take 1 job of status = NotStarted; and everything is sorted
    if (notStarted.length > 0 && (processing.length === 0 || inProgress.length === 0 )) {     
      testJobData.jobData = foundJobs[0];  
      trackJobData.jobData = foundJobs[0];  
      const testmodeEnabled = notStarted[0].testmode.enabled ==='true'?true:false;
      const testmodeSimulate = notStarted[0].testmode.simulate ==='true'?true:false;
      
      //takes testmode off or testmode enabled and simulate both true
      if (!testmodeEnabled || (testmodeEnabled && testmodeSimulate)) {
        logger.info('add job to testTrackerJobQueue');
        await testJobQueue.add(testJobData.name, testJobData, QueueOptions); 
        
      } else { //if testmode enabled = true
          logger.info("Testmode = enabled and Simulate = disabled");
      }   
    } else {
        logger.info("There a TestJob inProgress in the queue! app crashed auto retry will come here");
    }
  } catch (error) {
    logger.error(error.stack);
  }
}

async function obliterateJobsQueue(){ 
  await testJobQueue.obliterate();
  logger.info('obliterate testJobQueue');
}


const testJob = async (job) => {
  //already assume this is first time or continue job
  const jobId  = job.data.jobData.jobId;
  //let dbJobId='';
  let dbJobId = await dbUtilities.getJobFromDb(jobId);
  
 // add job to TestTrackWorker with 7sec delay
 // assuming sim will start on time
  //await testTrackerJobQueue.add(trackJobData.name, trackJobData, QueueOptions2);

  const testmodeSimulate = dbJobId.testmode.simulate;
  let testGroup = dbJobId.testGroup;
  const jobStatusNotStarted  = dbJobId.status === processStates.NotStarted? true:false;
  const jobStatusInProgress  = dbJobId.status === processStates.InProgress? true:false;
  watcher.watchFolder();
  try {
    if (jobStatusNotStarted) { //job status = NotStarted// starting new TestJob
      let testCollection = '';
      for (let index = 0; index < testGroup.length; index++) {     
        testCollection += testGroup[index].testId + ',';      
      } 
      //trim last character
      testCollection = testCollection.substring(0, testCollection.length - 1);
      
      try {
        if (testmodeSimulate) { //using simulate
          //const newDate = Date.now();//YYYY-MM-DDTHH:mm:ss.sssZ
          const formatNewDate = momentz.tz(Date.now(), config.get('timeZone'));
          logger.debug(formatNewDate.toString());
          await dbUtilities.findAndUpdateJob(dbJobId.jobId, {
            status: processStates.InProgress, 
            init_date: formatNewDate, 
            trans_date: formatNewDate 
          }); 
          
          const file = config.get('testmode.fileSimulater');
          const timeout = config.get('testmode.testDurationTime');
          const location = config.get('testmode.outputLocation');
          const tests = `-testArray ${testCollection}`;
          logger.debug(`starting simulate: ${testCollection}`);
          await psSimulate(file, timeout, location, tests);
          logger.debug(`finished simulate`);         
  
        } else { //not using simulate
          logger.error('Simulator off not developed.');
        }
      } catch (err) {
        logger.error(err.stack);
      } 
    } else if(jobStatusInProgress) { //found job in queue will retry
        logger.info("found process existed after crash");
        /*let testCollection = '';
        for (let i = 0; i < testGroup.length; i++) {
          if (testGroup[i].status === processStates.NotStarted || 
            testGroup[i].status === processStates.InProgress ) {
              
              testCollection += testGroup[i].testId + ',';         
          } else if(testGroup[i].status === processStates.InProgress) {
              /// new function
              //If processId exist in testJob in DB
              ////do:remove tests that have status pass/fail. this is for retry logic to start where left off
              //////if found inProgress->
              //////do:copy over CT and other logs to folder and set folder ending to crashed and remove test from new list
              //////do:update testjob crashed test in DB.
              ////else: update testJob status, start time, and processid
          }    
        }  */
        
        //need to think when found Inprogress after crash what to do
  
        //trim last character
        //testCollection = testCollection.substring(0, testCollection.length - 1);   
    } 
  } catch (error) {
    logger.error(error.stack);
  } finally {
    watcher.watchClose();
  }
  
    return job;
};

const stopJob = async (job) => {
 
    const name  = job.data.jobData.name;
  for (let index = 0; index < 3; index++) {
 
    logger.info(`stopJob: ${index}`); 
   }
   logger.info(`stopJob finished ${name}`);
     
     return job;
 };



///////////////////WORKER JOBS && HANDLERS/////////////////
const jobHandlers1 = {
  testJob: testJob
};
const jobHandlers2 = {
  stopJob: stopJob
};



const proxyObserver = {
  next(val) {
    asyncScheduler.schedule(
      (x) => finalObserver.next(x),
      0 /* delay */,
      val /* will be the x for the function above */
    );
  },

  // ...
};

const processJob1b = async (job) => {
 const handler = jobHandlers[job.name];
 const justObs =  new Observable((proxyObserver) => {
    
    if (handler ) {
      logger.info(`Processing job: ${job.name}`);
      proxyObserver.next(handler(job));
      //await handler(job);
    }
    
    return function unsubscribe() {
      console.log(`Unsubscribe in processJob: ${job.name} job.id= ${job.id} jobdata= ${job.data.jobData.name}`);
    };
  }).pipe(observeOn(asyncScheduler)
);

   
  const finalObserver = {
    next(val)  {
      logger.info(`New job: ${val.name} and id= ${val.id} jobdata= ${val.data.jobData.name}`);
      
      if (val.data.jobData.name ==='yellow') {
        logger.info(`Unsubscribe job: ${val.name} and id= ${val.id} jobdata= ${val.data.jobData.name}`);
        subs.unsubscribe();
      } 
    },
    error(err)  {logger.error(`error: ${err}`)},
    complete()  {logger.info(`Subscription: done`);}
  };

  const subs = justObs.subscribe(finalObserver);

};



//testJobs
const processJob = async (job) => {
  const handler = jobHandlers1[job.name];

    if (handler ) {
      logger.info(`Processing job: ${job.name}`);
      await handler(job);
    }
};

//stopJob
const processJob2 = async (job) => {
    const handler = jobHandlers2[job.name];
  
      if (handler ) {
        logger.info(`Processing job: ${job.name}`);
        await handler(job);
      }
  };

////////////WORKER CREATIONS///////////////////////////

const testWorker = new Worker(
    "testJobQueue", 
    processJob, 
    { connection: redisOptions,
      removeOnComplete: {
        age: 0,
        count: 0,
      },
      removeOnFail: {
        age: 0,
      }
     },
  );
logger.info("testWorker started!");
  
const stopWorker = new Worker("stopJobQueue", processJob2, { connection: redisOptions });
logger.info("stopJobWorker started!");



////////////WORKERS EVENTS///////////////////////////


testWorker.on("completed", (job) => {
  testJobQueue.remove(job.id);
  testJobQueue.removeRepeatable(job.name, QueueOptions, job.id);
  logger.info(`testWorker ${job.id} has completed!`);
});

testWorker.on("failed", (job, err) => {
logger.error(`testWorker has failed with ${err.message}; retry is in the works.`);
});

testWorker.on('error', err => {
// log the error
logger.error(err.stack);
});


stopWorker.on("completed", (job) => {
  //stopWorker.remove(job.id);
  logger.info(`stopWorker ${job.id} has completed!`);
});

stopWorker.on("failed", (job, err) => {
logger.error(`stopWorker ${job.id} has failed with ${err.message}`);
});

stopWorker.on('error', err => {
// log the error
logger.error(err.stack);
});


//////////////////ADD TO QUEUE//////////////////

const queueBehaviors = config.get('testmode.queueBehaviors') ==="true"?true:false;
const queueByPass = config.get('testmode.byPassQueue') ==="true"?true:false;
if (queueBehaviors || queueByPass) {
  setTimeout( async () => {
    //let foundProcess = await dbUtilities.findInProgressTestJob();
    let foundStates = await dbUtilities.findInProgressAndNotStartedTestJobs();

    if (foundStates.inProgressExist) {
        logger.info('front found inprogess Testjob doing nothing!!!');

    } else if(foundStates.notStartedExist && !foundStates.inProgressExist){
        logger.info('front did not find inprogess Testjobs but did find NotStarted TestJobs; starting new job');
        addTestJobToQueue();

    } else { 
        logger.info('front found no inprogess or notStarted Testjobs; doing nothing!!!'); 
    }
  }, config.get('addToQueueDelay')); 
}


//////////////////EXPORT////////////////////////////
module.exports.redisOptions = redisOptions;
module.exports.testJobQueue = testJobQueue;
module.exports.stopJobQueue = stopJobQueue;
module.exports.addTestJobToQueue = addTestJobToQueue;
module.exports.obliterateJobsQueue = obliterateJobsQueue;
