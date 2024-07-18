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


// if add rapid new data, 2 or more the testJob function will read same JobId. have gap when adding.
async function addTestJobToQueue(newJob) {
  try {
    //await utilities.checkingDatabaseStatus('addTestJobToQueue.Queue.cjs');
    //logger.info('looking for jobs');
  /*   let foundJobs = await dbUtilities.findAll()   
    const notStarted = _.filter(foundJobs, {'status': processStates.NotStarted});
    const processing = _.filter(foundJobs, {'status': processStates.Processing});
    const inProgress = _.filter(foundJobs, {'status': processStates.InProgress}); */
    
    const testmodeEnabled = newJob.testmode.enabled ==='true'?true:false;
    const testmodeSimulate = newJob.testmode.simulate ==='true'?true:false;
    //only take 1 job of status = NotStarted; and everything is sorted
    if (newJob.status === processStates.NotStarted) {     
      testJobData.jobData = newJob; 
      
      //takes testmode off or testmode enabled and simulate both true
      if (!testmodeEnabled || (testmodeEnabled && testmodeSimulate)) {
        logger.info('add job to testJobQueue');
        await testJobQueue.add(testJobData.name, testJobData, QueueOptions); 
        
      } else { //if testmode enabled = true
          logger.info("Testmode = enabled and Simulate = disabled");
      }   
    } else if(newJob.status === processStates.InProgress ){
                
        if (testmodeEnabled && testmodeSimulate) {
          logger.warn("There a TestJob inProgress in the queue! Simulating app crashed auto retry will come here");
          testJobData.jobData = newJob;
          await testJobQueue.add(testJobData.name, testJobData, QueueOptions); 
        } else {
          logger.error("There a TestJob inProgress in the queue! This is rejected in Production mode");
        }
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
  logger.debug(`Top of TestJob function`);
  let watcher = new observer('./logs');
  await utilities.checkingDatabaseStatus('testJob.Queue.cjs');
  const jobId  = job.data.jobData.jobId;
  logger.debug(`jobId: ${jobId}`)
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
  logger.debug(`jobStatusNotStarted = ${jobStatusNotStarted}`);
  try {

    if (jobStatusNotStarted) { //job status = NotStarted// starting new TestJob
      logger.debug(`jobStatusNotStarted = true`);
      let testCollection = '';
      for (let index = 0; index < testGroup.length; index++) {     
        testCollection += testGroup[index].testId + ',';      
      } 
      //trim last character
      testCollection = testCollection.substring(0, testCollection.length - 1);
      
      try {
        if (testmodeSimulate) { //using simulate
          //const newDate = Date.now();//YYYY-MM-DDTHH:mm:ss.sssZ
          logger.debug(`testmodeSimulate = true`);
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

        //find test InProgress.
        const newList = await utilities.buildNewNotStartedTestJobList(dbJobId);

        
        
        //need to think when found Inprogress after crash what to do
  
   
    } 
  } catch (error) {
    logger.error(error.stack);
  } finally {

    mongoose.connection.close();
    watcher.watchClose();
  }
  
    return job;
};

const stopJob = async (job) => {
 
  await utilities.checkingDatabaseStatus('stopJob.Queue.cjs');
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
      logger.info(`Processing TestJob: ${job.name}`);
      await handler(job);
    }
};

//stopJob
const processJob2 = async (job) => {
    const handler = jobHandlers2[job.name];
  
      if (handler ) {
        logger.info(`Processing StopJob: ${job.name}`);
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



//////////////////EXPORT////////////////////////////
module.exports.redisOptions = redisOptions;
module.exports.testJobQueue = testJobQueue;
module.exports.stopJobQueue = stopJobQueue;
module.exports.addTestJobToQueue = addTestJobToQueue;
module.exports.obliterateJobsQueue = obliterateJobsQueue;
