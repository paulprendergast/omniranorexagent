const { Worker } = require( "bullmq");
const { logger } = require("./logger.cjs");
const { QueueOptions, QueueOptions2,  testTracker, testTrackerJobQueue, testJob, stopJob, stopJobQueue, redisOptions, testJobQueue } = require( "./queues.cjs");
const { Observable, observeOn, asyncScheduler } = require("rxjs");

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

////////////WORKERS AND EVENTS///////////////////////////

const worker = new Worker(
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

worker.on("completed", (job) => {
    testJobQueue.remove(job.id);
    testJobQueue.removeRepeatable(job.name, QueueOptions, job.id);
    logger.info(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  logger.info(`${job.id} has failed with ${err.message}`);
});

worker.on('error', err => {
  // log the error
  logger.error(err.stack);
});
logger.info("testJobWorker started!");

const stopWorker = new Worker("stopJobQueue", processJob2, { connection: redisOptions });
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

logger.info("testTrackerWorker started!");