var config = require('config');
const { logger } = require("./logger.cjs");
//const { default: mongoose } = require('mongoose');
const _ = require('lodash');
const { jobSchema } = require('../models/job.cjs');
const { Queue, Worker } = require("bullmq");
const { psGetProcess, psSimulate } = require('./powershellTools.cjs');
const { processStates } = require('../states/process.states.cjs');
const redisOptions = { host: "localhost", port: 6379 };
const { PowerShell } = require("node-powershell");
const db = require('./db.cjs');
//const { Observable, observeOn, asyncScheduler } = require("rxjs");



const QueueOptions = {
  delay: 5000,
  attempts: 0,
  backoff: 0,
  removeOnComplete: true,
  removeOnFail: true 
};
const QueueOptions2 = {
  delay: 2000,
  attempts: 0,
  backoff: 0,
  removeOnComplete: true,
  removeOnFail: true 
};
const testJobQueue = new Queue("testJobQueue", { connection: redisOptions });
const stopJobQueue = new Queue("stopJobQueue", { connection: redisOptions });
const testTrackerJobQueue = new Queue("testTrackerJobQueue", { connection: redisOptions });



async function addTestJobToQueue() {
  try {
    logger.info('looking for jobs');
    let foundJobs ='';
    await db().then( async mongoose => {
      
      try {
        const jobModel = mongoose.model('Jobs', jobSchema);
        let responseJobs = jobModel.find({});
        foundJobs = await responseJobs.sort({ init_date: 'asc'});
        
      }catch (error) {
          console.log(error.stack);
      }finally {
          mongoose.connection.close();
      }      
    }).catch(err => {
      logger.error(err.stack);
    })        
    /* let responseJobs = jobModel.find({});
    let foundJobs = await responseJobs.sort({ init_date: 'asc'})
                                      .then(async(jobs) => {
                                        logger.info('foundjobs');
                                      }); */


    const notStarted = _.filter(foundJobs, {'status': processStates.NotStarted});
    const processing = _.filter(foundJobs, {'status': processStates.Processing});
    const inProgress = _.filter(foundJobs, {'status': processStates.InProgress});
    
    //only take 1 job of status = NotStarted; and everything is sorted
    if (notStarted.length > 0 && (processing.length === 0 || inProgress.length === 0 )) {
      let testJob = { name: 'testJob',
              jobData: foundJobs[0],
      };

      let trackJob = { name: 'testTracker',
              jobData: foundJobs[0],
      };

      const testmodeEnabled = notStarted[0].testmode.enabled ==='true'?true:false;
      const testmodeSimulate = notStarted[0].testmode.simulate ==='true'?true:false;
      
      //takes testmode off or testmode enabled and simulate both true
      if (!testmodeEnabled || (testmodeEnabled && testmodeSimulate)) {

        logger.info('add job to testTrackerJobQueue');
        await testTrackerJobQueue.add(trackJob.name, trackJob, QueueOptions2);
        logger.info('add job to testJobQueue');
        await testJobQueue.add(testJob.name, testJob, QueueOptions);
        
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
  const testmodeSimulate = job.data.jobData.testmode.simulate;
  let testGroup = job.data.jobData.testGroup;
  const jobStatusNotStarted  = job.data.jobData.status === processStates.NotStarted? true:false;

  if (jobStatusNotStarted) { //job status = NotStarted
    try {
      if (testmodeSimulate) { //using simulate
        let testCollection = '';
        for (let i = 0; i < testGroup.length; i++) {
          testCollection += testGroup[i].testId + ',';
          
        }
        //trim last character
        testCollection = testCollection.substring(0, testCollection.length - 1);
  
        
       /*  const file = `.\\src\\utils\\scripts\\simulate.ps1`;
        const timeout = `-timeout 5`;
        const location = `-testlocation .\\logs\\`;
        const tests = `-testArray TC12345,TC67890`; */
        
        const file = config.get('testmode.fileSimulater');
        const timeout = config.get('testmode.testDurationTime');
        const location = config.get('testmode.outputLocation');
        const tests = `-testArray ${testCollection}`; 
        await psSimulate(file, timeout, location, tests);

      } else { //not using simulate
        
      }
    } catch (err) {
      logger.error(err.stack);
    }
    
    
  } else { //reject job
    logger.error(`testJob: ${jobId}; status != NotStarted`);    
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

 const testTracker = async (job) => {
 
  const jobId  = job.data.jobData.jobId;
  for (let index = 0; index < 3; index++) {
 
      logger.info(`testTracker: ${index}`); 
   } 
      logger.info(`testTracker finished ${jobId}`);
  /*   try {
      let newResult =  await powershellGetProcess();
    } catch (error) {
      logger.error(error);
    } */
     
     return job;
 };

 const powershellGetProcess = () => {
  return new Promise((resolve, reject) => {

    const ps = new PowerShell({
        executionPolicy: 'Bypass',
        noProfile: true,
        PATH: process.env.PATH
    }); 

    
    const command = PowerShell.command`.\\test\\FetchPwsh_process.ps1`;
    ps.invoke(command)
    .then(output => {
      console.log(output);
      //const result = JSON.parse(output.raw);
      ps.dispose();
      resolve(output);
    })
    .catch(err => {
      console.log(err);
      ps.dispose();
      reject(err);
    });
  });

 };

 
 const powershellCall2 = () => {
  return new Promise((resolve, reject) => {
    try {
      const ps = new PowerShell({
        executionPolicy: 'Bypass',
        noProfile: true,
        PATH: process.env.PATH
      }); 

    /*   const file = `.\\test\\RanorexSimulateStandalone.ps1`;
      const timeout = `-timeout 5`;
      const location = `-testlocation .\\logs`;
      const tests = `-testArray TC12345,TC67890`;
      
      const newString = file.concat( " ", timeout, " ", location, " ", tests);
      const command = PowerShell.command`${newString}`.replace("\"","").replace("\"",""); */
      const command = PowerShell.command`pwd`;
        ps.invoke(command)
        .then(output => {
          logger.info(output);
          //const result = JSON.parse(output.raw);
          ps.dispose();
          resolve(output);
        })
        .catch(err => {
          logger.error(err.stack);
          ps.dispose();
          reject(err);
        });
    } catch (err) {
      logger.error(err.stack);
    }
  });
 };

 const powershellCall = (file, timeout, location, tests) => {
  return new Promise((resolve, reject) => {

    try {
        const ps = new PowerShell({
          executionPolicy: 'Bypass',
          noProfile: true,
          PATH: process.env.PATH
        }); 

        /* const file = `.\\src\\utils\\scripts\\simulate.ps1`;
        const timeout = `-timeout 5`;
        const location = `-testlocation .\\logs\\`;
        const tests = `-testArray TC12345,TC67890`; */
        
        //const newString = file.concat( ` `, timeout, ` `, location, ` `, tests);
        const newString2 = `${file} ${timeout} ${location} ${tests}`;
        //const newString3 = `${file} -timeout ${timeout} -testlocation ${location} -testArray ${tests}`;
        //const command = PowerShell.command`${newString}`//.replace("\"","").replace("\"","");
        //const command = PowerShell.command`.\\test\\RanorexSimulateStandalone.ps1 -timeout 5 -testlocation .\\logs\\ -testArray TC12345,TC67890`;
        //const command = PowerShell.command`cd .\\test; pwd`;
        //const command = PowerShell.command` .\\src\\utils\\scripts\\simulate.ps1 -timeout 5 -testlocation .\\logs\\ -testArray TC12345,TC67890`;
        //const command = PowerShell.command`.\\test\\test.ps1`;
        const command = PowerShell.command`${newString2}`.replace("\"","").replace("\"","");
          ps.invoke(command)
          .then(output => {
            logger.info(output.raw);
            //const result = JSON.parse(output.raw);
            ps.dispose();
            resolve(output);
          })
          .catch(err => {
            logger.error(err.stack);
            ps.dispose();
            reject(err);
          });
      } catch (err) {
        logger.error(err.stack);
      }
  });
};

setTimeout( () => {
  addTestJobToQueue();
}, 30000);

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
  logger.info(`${job.id} has completed!`);
});

testWorker.on("failed", (job, err) => {
logger.info(`${job.id} has failed with ${err.message}`);
});

testWorker.on('error', err => {
// log the error
logger.error(err.stack);
});


stopWorker.on("completed", (job) => {
  //stopWorker.remove(job.id);
  logger.info(`${job.id} has completed!`);
});

stopWorker.on("failed", (job, err) => {
logger.info(`${job.id} has failed with ${err.message}`);
});

stopWorker.on('error', err => {
// log the error
logger.error(err.stack);
});


testTrackerWorker.on("completed", (job) => {
//testTrackingJobQueue.remove(job.id);
logger.info(`${job.id} has completed!`);
});

testTrackerWorker.on("failed", (job, err) => {
logger.info(`${job.id} has failed with ${err.message}`);
});

testTrackerWorker.on('error', err => {
// log the error
logger.error(err.stack);
});


 



module.exports.redisOptions = redisOptions;
module.exports.testJobQueue = testJobQueue;
module.exports.stopJobQueue = stopJobQueue;
module.exports.testTrackerJobQueue = testTrackerJobQueue;
module.exports.addTestJobToQueue = addTestJobToQueue;
module.exports.obliterateJobsQueue = obliterateJobsQueue;
