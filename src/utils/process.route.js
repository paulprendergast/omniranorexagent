var config = require('config');
//const express = require('express');
//const initRouter = express.Router();
const logger = require("./logger");
const {jobSchema } = require('../models/job');
const { default: mongoose } = require('mongoose');
const processStates = require('../states/process.states');
var _ = require('lodash');
const utilities = require('./utilities');
const { spawn, Thread, Worker} = require('threads');



const process = async function createProcess(procJobs){
    try {
        logger.info("Starting Processing in 30 seconds");
        //const jobModel = mongoose.model('Jobs', jobSchema);
        //const responseJobs = await jobModel.find({}).sort({ init_date: 'desc'}).exec();
        if (procJobs.length != 0) {
            logger.debug('found jobs in Jobs table');
            const processingJobs = _.filter(procJobs, job => job.status ===  processStates.Processing);
            const inProgressJobs = _.filter(procJobs, job => job.status ===  processStates.InProgress);
            const notStartedJobs = _.filter(procJobs, job => job.status ===  processStates.NotStarted);               

            const commandWorker = await spawn(new Worker('./worker'));
            if (processingJobs.length ===0 && inProgressJobs.length===0 && notStartedJobs.length > 0) {
                logger.info('Starting to run job');

                let firstSortedNotStartedJob = _.sortBy(notStartedJobs, ['init_date'])[0];
                const testmode = firstSortedNotStartedJob.testmode.enabled.toLowerCase() === "true";
                const testSimulate = firstSortedNotStartedJob.testmode.simulate.toLowerCase() === "true";

                //utilities.findAndUpdateJobStatus(firstSortedNotStartedJob.jobId, processStates.InProgress);
                const testConfig = { testmode: testmode, testSimulate: testSimulate };
                const job = JSON.stringify(firstSortedNotStartedJob);               
               
                await commandWorker.callRemoteCommand(testConfig, job );
                logger.info('started worker');
                
    
            } if (processingJobs.length ===1 || inProgressJobs.length===1) {

                logger.info('about to terminate worker');
                Thread.terminate(commandWorker);
                logger.info('terminated worker');
            } 
            else logger.info('No Test Job ready to start.');
        } else {

            logger.info('There is nothing in the Jobs table');
        }
        
    } catch (error) {
        logger.debug({error: error, stack: error.stack});
    }

};

module.exports.process = process;