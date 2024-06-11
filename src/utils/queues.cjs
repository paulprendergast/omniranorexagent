var config = require('config');
const { logger } = require("./logger.cjs");
const { default: mongoose } = require('mongoose');
const _ = require('lodash');
const { jobSchema } = require('../models/job.cjs');
const { Queue } = require("bullmq");
const { psGetProcess, psSimulate } = require('./powershellTools.cjs');
const { timeout } = require("rxjs");
const { processStates } = require('../states/process.states.cjs');
const redisOptions = { host: "localhost", port: 6379 };
const { PowerShell } = require("node-powershell");


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
const jobModel = mongoose.model('Jobs', jobSchema);


async function addTestJobToQueue() {
  try {
    logger.info('looking for jobs');
    
    let responseJobs = jobModel.find({});
    let foundJobs = await responseJobs.sort({ init_date: 'asc'})
                                      .then(async(jobs) => {
                                        logger.info('foundjobs');
                                      });


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
        await testTrackerJobQueue.add(trackJob.name, trackJob, QueueOptions2);

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
  
        /* 
        const file = `.//ps//RanorexSimulateStandalone.ps1`;
        const timeout = `-timeout 5`;
        const location = `-testlocation .\\..\\..\\logs\\`;
        const tests = `-testArray TC12345,TC67890`;
        */
        const file = config.get('testmode.fileSimulater');
        const timeout = config.get('testmode.testDurationTime');
        const location = config.get('testmode.outputLocation');
        const tests = `-testArray ${testCollection}`;
        await psSimulate();

  
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

 const powershellCall = () => {
  return new Promise((resolve, reject) => {

    try {
      const ps = new PowerShell({
        executionPolicy: 'Bypass',
        noProfile: true,
        PATH: process.env.PATH
      }); 

      const file = `.\\test\\RanorexSimulateStandalone.ps1`;
      const timeout = `-timeout 5`;
      const location = `-testlocation .\\logs\\`;
      const tests = `-testArray TC12345,TC67890`;
      
      const newString = file.concat( " ", timeout, " ", location, " ", tests);
      const command = PowerShell.command`${newString}`.replace("\"","").replace("\"","");
      //const command = PowerShell.command`.\\test\\RanorexSimulateStandalone.ps1 -timeout 5 -testlocation .\\logs\\ -testArray TC12345,TC67890`;
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

setTimeout( () => {
  addTestJobToQueue();
}, 30000);


 



module.exports.redisOptions = redisOptions;
module.exports.testJobQueue = testJobQueue;
module.exports.stopJobQueue = stopJobQueue;
module.exports.testTrackerJobQueue = testTrackerJobQueue;
module.exports.addTestJobToQueue = addTestJobToQueue;
module.exports.obliterateJobsQueue = obliterateJobsQueue;
module.exports.testJob = testJob;
module.exports.stopJob = stopJob;
module.exports.testTracker = testTracker;
module.exports.QueueOptions = QueueOptions;
module.exports.QueueOptions2 = QueueOptions2;