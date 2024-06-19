var config = require('config');
const _ = require('lodash');
const db = require('./db.cjs');
//const express = require('express');
//const initRouter = express.Router();
const { logger } = require("./logger.cjs");
const { jobSchema } = require('../models/job.cjs');
//const { default: mongoose } = require('mongoose');
const { processStates } = require('../states/process.states.cjs');




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
        logger.error(error.stack);
    }   
}; 

async function findAndUpdateJobStatus(jobId, statusValue) {

    try {
            await db().then(async mongoose => {
                try {
                    const jobModel = mongoose.model('Jobs', jobSchema);
                    const filter = { jobId: jobId};
                    const update = { status: statusValue};      
                    return await jobModel.findOneAndUpdate(filter, update, {new: true}); 
                    
                }catch (error) {
                    console.log(error.stack);
                }finally {
                    mongoose.connection.close();
                }
            }).catch(err =>{ 
                logger.error(err.stack);
            });       
    } catch (error) {
        logger.error(error.stack);
    }
}


module.exports.filterObject = filterObject;
module.exports.findAndUpdateJobStatus = findAndUpdateJobStatus;