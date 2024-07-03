var config = require('config');
const { default: mongoose } = require('mongoose');
const _ = require('lodash');
const db = require('./db.cjs');
const redisOptions = { host: "localhost", port: config.get('redisPort') };
const moment = require("moment");
const momentz = require("moment-timezone");
const utilities = require('./dbUtilities.cjs');
const node = require('timers/promises');
const fs = require('node:fs');
const path = require('node:path');
const fsPromises = require('node:fs/promises');
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
const testTrackerJobQueue = new Queue("testTrackerJobQueue", { connection: redisOptions });

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
    let foundJobs = await utilities.findAll()   
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
        logger.info("There a TestJob inProgress!");
    }
  } catch (error) {
    logger.error(error.stack);
  }
}

async function obliterateJobsQueue(){ 
  await testTrackerJobQueue.obliterate();
  logger.info('obliterate testTrackerJobQueue');
  await testJobQueue.obliterate();
  logger.info('obliterate testJobQueue');
}

async function drainJobsQueue(){
  await testJobQueue.drain();
}

const testJob = async (job) => {
  //already assume this is first time or continue job
  const jobId  = job.data.jobData.jobId;
  //let dbJobId='';
  let dbJobId = await utilities.getJobFromDb(jobId);
  
 // add job to TestTrackWorker with 7sec delay
 // assuming sim will start on time
  await testTrackerJobQueue.add(trackJobData.name, trackJobData, QueueOptions2);

  const testmodeSimulate = dbJobId.testmode.simulate;
  let testGroup = dbJobId.testGroup;
  const jobStatusNotStarted  = dbJobId.status === processStates.NotStarted? true:false;
  const jobStatusInProgress  = dbJobId.status === processStates.InProgress? true:false;

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
        await utilities.findAndUpdateJob(dbJobId.jobId, {
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

 function decyferGetProcess( proccesses) {
  try {
    let newArray = proccesses.raw.split('\n');
    let foundProcesss = _.remove(newArray, n => {
      return n.includes('pwsh');
    });
    
    return foundProcesss;  
  } catch (error) {
    logger.error(error.stack);
  }
 }

 function findRunningTestJobProcess(pAfter) {
    try {
      
      let tempPAfter = new Array();
      for (let index = 0; index < pAfter.length; index++) {
        const element = pAfter[index];
        const foundInner = element.split(' ');
        tempPAfter[index] = {'id':Number(foundInner[0]),'proc':foundInner[1], 'date': new Date(foundInner[2] +" "+ foundInner[3])};        
      }

      //sort inner array by date

      const foundSorted = _.orderBy(tempPAfter,['date'],['desc']);
      const foundTake = _.take(foundSorted,2);
      logger.debug(`found process ${foundTake[1].id}`);// 0 process is the pwsh getProcess; 1 is the sim process
      return foundTake[1];
    } catch (error) {
      logger.error(error.stack);
    }
 }


const testTracker = async (job) => {
  const jobId  = job.data.jobData.jobId;
  
  try {
      logger.info('add job to testTrackerJobQueue');
      await node.setTimeout(61000);//this put a gap in pwsh starttime
      let minuteAfter =  decyferGetProcess(await psGetProcess());
      const testJobProcess = findRunningTestJobProcess(minuteAfter); 
      
      // store processId in testJob in DB
      const formatNewDate = momentz.tz(testJobProcess.date, config.get('timeZone'));
      await utilities.findAndUpdateJob(jobId, {
        process: {
          id: testJobProcess.id, 
          init_date: formatNewDate
        } 
      });
     
      let lastRound = false;
      //watcherDelay default 65000
      let watcherDelay = config.get('watcherDelay');
      while (true) {
        await watchFolderStatusAndUpdate(jobId);
        if(lastRound)
          break;

        let dbJobProcessId = await utilities.getJobFromDb(jobId);
        dbJobProcessId = dbJobProcessId.process.id;        
        // watch ProcessID until it does not exist
        if(!((await psGetProcess()).raw.includes(dbJobProcessId))) {lastRound = true; watcherDelay = 5000;}
        await node.setTimeout(watcherDelay);
      }

      //Update JobId status = Complete
      const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
      await utilities.findAndUpdateJob(jobId, {
          status: processStates.Completed, 
          trans_date: completeNewDate 
      });
  } catch (error) {
    logger.error(error.stack);
  }
     
  return job;
};

async function watchFolderStatusAndUpdate(jobId) {
  try {
        logger.debug(`Current directory: ${__dirname}`);
        const dirPath = path.join(__dirname, './../../logs/');
        let folders = fs.readdirSync(dirPath);
        logger.debug(`found directory: ${dirPath}`); // directories and 2 files      
        logger.debug(`folder last: ${folders.pop()}`); //remove all.log
        logger.debug(`folder last2: ${folders.pop()}`); //error.log
        logger.debug(`found after two pops: ${folders}`); //all directories
          
       //[{TC12345-09-05-Fail,2024-07-01T09:05:00.000+00:00}]
        let testMapToBirthDate = new Map();
        for(const fold of folders) {
          logger.debug(`folder: ${fold}`);
          let value = await fsPromises.stat(path.join(dirPath, fold));
          logger.debug(`folder: ${fold}: ${value.birthtime}`);
          let newDate = new Date(value.birthtime);
          let modDate = new Date(value.mtime);
          logger.debug(newDate.toString());
          testMapToBirthDate.set(fold, { birthDate: newDate, modDate: modDate });      
        }
        logger.debug([...testMapToBirthDate.entries()]);

        //Get Latest TestJob update from DB
        let dbJob = await utilities.getJobFromDb(jobId);
        const runProcDate = dbJob.process.init_date;

        ///finds tests started after sim process date
        let newMap = new Map();
        for(const [myKey, myValue] of testMapToBirthDate) {
          const myKeySub = myKey.split('-')[0];//testID
          if(myValue.birthDate.getTime() > runProcDate.getTime()) {
            newMap.set(myKeySub, {test: myKey, birthDate: myValue.birthDate, modDate: myValue.modDate });
          }
        }


        //which has status or no status.
        const foundTestStatus = new Map();
        const foundTestNoStatus = new Map();
        for( const [myKey, myValue] of newMap){
          const myKeySub = myValue.test.includes('-Pass') || myValue.test.includes('-Fail') ||
                            myValue.test.includes('-Crash')? true:false;
          if(myKeySub) {
            foundTestStatus.set(myKey, {test: myValue.test, birthDate: myValue.birthDate, modDate: myValue.modDate });
          }else {
            foundTestNoStatus.set(myKey, {test: myValue.test, birthDate: myValue.birthDate, modDate: myValue.modDate });
          }
        }


        //update status for TC  
        let dbTests = dbJob.testGroup; //array
        let results = new Array();
        //Test has start date, needs workstatus =inprogress, has not finshed or pass/fail
        for(const [myKey, myValue] of foundTestNoStatus) {
          for(const dbTest of dbTests){
            if (myKey === dbTest.testId) { //test has started never finished
              results.push({
                testId: dbTest.testId,
                start_date: myValue.birthDate,
                finished_date: dbTest.finished_date,
                workStatus: processStates.InProgress,
                status: processStates.InProgress
              });
              break;
            }
          } 
        }
        //update status for TC 
        //Test has finshed, has workstatus = finished and status = pass/fail
        for(const [myKey, myValue] of foundTestStatus) {
          for(const dbTest of dbTests){
            if (myKey === dbTest.testId && dbTest.workStatus !== processStates.Finished) { //test has started never finished
              let status = "";
              if (myValue.test.includes('-Pass')) {
                status = processStates.Pass;
              } else if(myValue.test.includes('-Fail')) {
                status = processStates.Fail;
              } else {
                status = processStates.Crash;
              }
              results.push({
                testId: dbTest.testId,
                start_date: myValue.birthDate,
                finished_date: myValue.modDate,//need this mod date folders
                workStatus: processStates.Finished,
                status: status
              });
              break;
            }
          }
        }
        logger.debug(`results: ${results}`);
        // get inverse test of intersection and add with changes to new list
        let rTestNames = Array();
        let dbTestNames = Array();
        for (let index = 0; index < results.length; index++) {
          rTestNames.push(results[index].testId);  
        }
        for (let index = 0; index < dbTests.length; index++) {
          dbTestNames.push(dbTests[index].testId);
        }
        const xorName = _.xor(rTestNames,dbTestNames);
        let dbXor = new Array();
        for (let j = 0; j < xorName.length; j++) {
          for (const test of dbTests) {
            if (xorName[j] === test.testId) {
              dbXor.push({
                testId: test.testId,
                start_date: test.start_date,
                finished_date: test.finished_date,
                workStatus: test.workStatus,
                status: test.status
              });
              break;
            } 
          }
        }
        
        const newUnOrder = results.concat(dbXor);
        logger.debug(`newUnOrder: ${newUnOrder}`);
        
        // follow DBTests order.
        let newOrder = Array();
        for(const dbTest of dbTests) {
          for(const n of newUnOrder){
            if(dbTest.testId === n.testId){
              newOrder.push(n);
              break;
            }
          }        
        }
        logger.debug(`newOrder: ${newOrder}`);
        let dbTestsFormat = Array();
        for(const dbtest of dbTests){
          dbTestsFormat.push({
            testId: dbtest.testId,
            start_date: dbtest.start_date,
            finished_date: dbtest.finished_date,
            workStatus: dbtest.workStatus,
            status: dbtest.status
          })
        }

        const compareResults = compareTestSet(dbTestsFormat, newOrder);
        const compareString = compareResults === true? 'Matched-true - tests are not updated to DB': 'UnMatched-false - tests are getting updated to DB';       
        logger.debug(`compareTest: ${compareString}`);

        //return count of TC that do not have status.
        if (newOrder.length === newUnOrder.length && !compareResults) {
          logger.debug("watchFolderStatusAndUpdate() work correctly");
          await utilities.findAndUpdateJob(jobId,{testGroup: newOrder});
        } 
  } catch (error) {
    logger.error(error.stack);
  }
}

function compareTestSet(tOld, tNew) {
  
  logger.debug(JSON.stringify(tOld));

  logger.debug(JSON.stringify(tNew));

  return JSON.stringify(tOld) === JSON.stringify(tNew);
}


///////////////////WORKER JOBS && HANDLERS/////////////////
const jobHandlers1 = {
  testJob: testJob
};
const jobHandlers2 = {
  stopJob: stopJob
};
const jobHandlers3 = {
  testTracker: testTracker
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

//testTracker
const processJob3 = async (job) => {
    const handler = jobHandlers3[job.name];    
  
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

const testTrackerWorker = new Worker(
    "testTrackerJobQueue", 
    processJob3, 
    { connection: redisOptions,
      removeOnComplete: {
        age: 0,
        count: 0,
      },
      removeOnFail: {
        age: 0,
      }
    });
logger.info("testTrackerWorker started!");

////////////WORKERS EVENTS///////////////////////////


testWorker.on("completed", (job) => {
  testJobQueue.remove(job.id);
  testJobQueue.removeRepeatable(job.name, QueueOptions, job.id);
  logger.info(`testWorker ${job.id} has completed!`);
});

testWorker.on("failed", (job, err) => {
logger.error(`testWorker ${job.id} has failed with ${err.message}`);
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


testTrackerWorker.on("completed", (job) => {
//testTrackingJobQueue.remove(job.id);
logger.info(`testTrackerWorker ${job.id} has completed!`);
});

testTrackerWorker.on("failed", (job, err) => {
logger.error(`testTrackerWorker ${job.id} has failed with ${err.message}`);
});

testTrackerWorker.on('error', err => {
// log the error
logger.error(err.stack);
});


 
//////////////////ADD TO QUEUE//////////////////

const queueBehaviors = config.get('testmode.queueBehaviors') ==="true"?true:false;
if (queueBehaviors) {
  setTimeout( async () => {
    
    if (!(await utilities.findInProgressTestJob())) {
      logger.info('front did not find inprogess Testjob starting new job');
      addTestJobToQueue();           
    } else {
      logger.info('front found inprogess Testjob doing nothing');
    }
  }, config.get('addToQueueDelay')); 
}


//////////////////EXPORT////////////////////////////
module.exports.redisOptions = redisOptions;
module.exports.testJobQueue = testJobQueue;
module.exports.stopJobQueue = stopJobQueue;
module.exports.testTrackerJobQueue = testTrackerJobQueue;
module.exports.addTestJobToQueue = addTestJobToQueue;
module.exports.obliterateJobsQueue = obliterateJobsQueue;
