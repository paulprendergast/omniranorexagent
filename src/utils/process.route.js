var config = require('config');
//const express = require('express');
//const initRouter = express.Router();
const logger = require("./logger");
const {jobSchema } = require('../models/job');
const { default: mongoose } = require('mongoose');
const processStates = require('../states/process.states');
var _ = require('lodash');

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

            if (processingJobs.length ===0 && inProgressJobs.length===0 && notStartedJobs.length > 0) {
                logger.info('Starting to run job');
               

            } 
            else logger.info('Process is not starting');
        } else {
            logger.info('There is nothing in the Jobs table');
        }
        
    } catch (error) {
        logger.debug(error.stack);
    }

};

module.exports.process = process;