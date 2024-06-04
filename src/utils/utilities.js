var config = require('config');
//const express = require('express');
//const initRouter = express.Router();
const logger = require("./logger");
const {jobSchema } = require('../models/job');
const { default: mongoose } = require('mongoose');
const processStates = require('../states/process.states');
const _ = require('lodash');



function filterObject(obj) {

    try {
        
        logger.debug('Starting root page filter');
        const processing = _.filter(obj, job => job.status ===  processStates.Processing);
        const inProgress = _.filter(obj, job => job.status ===  processStates.InProgress);
        const notStarted = _.filter(obj, job => job.status ===  processStates.NotStarted);
        const completed = _.filter(obj, job => job.status ===  processStates.Completed);
        const stopped = _.filter(obj, job => job.status ===  processStates.Stopped);
        const paused = _.filter(obj, job => job.status ===  processStates.Paused);
        let newArray = [processing,inProgress,notStarted,paused,stopped,completed];
        const final = Array.prototype.concat(...newArray);
        //return Array.prototype.concat(...newArray);
        return new Promise((resolve, reject) => {

            if (final instanceof Array) {
                resolve(final);
            }else {
                reject('filterObject promise did not work');
            }
        });
    } catch (error) {
        logger.debug(error);
    }   
}; 

async function findAndUpdateJobStatus(jobId, statusValue) {

    try {
        const jobModel = mongoose.model('Jobs', jobSchema);
        const filter = { jobId: jobId};
        const update = { status: statusValue};      
        return await jobModel.findOneAndUpdate(filter, update, {new: true});
    } catch (error) {
        logger.debug(error);
    }
}


module.exports.filterObject = filterObject;
module.exports.findAndUpdateJobStatus = findAndUpdateJobStatus;