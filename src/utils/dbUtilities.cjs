var config = require('config');
const _ = require('lodash');
const db = require('./db.cjs');
//const express = require('express');
//const initRouter = express.Router();
const { logger } = require("./logger.cjs");
const { jobSchema } = require('../models/job.cjs');
const { default: mongoose } = require('mongoose');
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

function findAndUpdateJob(jobId, statusValue) {
    return new Promise( async (resolve,reject) => {
        try {
            await db();
            const jobModel = mongoose.model('Jobs', jobSchema);
            const filter = { jobId: jobId};
            const update = statusValue;  
            const response = await jobModel.findOneAndUpdate(filter, update, {new: true});    
            if(response !== null || response !==''){
                resolve(response);
            }else{
                reject('findAndUpdateJob promise rejected');
            }        
        } catch (error) {
            logger.error(error.stack);
        }
        finally {
            await mongoose.connection.close();
        }
    });
}


function findInProgressTestJob() {
    return new Promise(async (resolve, reject) =>{
        try {
            await db();
            const jobModel = mongoose.model('Jobs', jobSchema);
            const filter = { status: processStates.InProgress};
            const found = await jobModel.find(filter).exec();
            let found2 = found.length === 1 ? true: false;
            if (found !== null || found !== '') {
                resolve({
                    job: found[0],
                    exist: found2
                });
            } else {
                reject('findInProgressTestJob promise rejected');
            }
        } catch (error) {
            logger.error(error.stack);
        } finally {
            await mongoose.connection.close();
        }
    });   
}

function findInProgressAndNotStartedTestJobs(){
    return new Promise(async (resolve, reject) =>{
        try {
            await db();
            const jobModel = mongoose.model('Jobs', jobSchema);
            let responseJobs = await jobModel.find({}).sort({ init_date: 'asc'}).exec();
            const inProgress = _.filter(responseJobs, job => job.status ===  processStates.InProgress);
            const notStarted = _.filter(responseJobs, job => job.status ===  processStates.NotStarted);
            let binProgress = inProgress.length > 0? true: false;
            let bnotStarted = notStarted.length > 0? true: false;
            resolve({inProgressExist: binProgress, notStartedExist: bnotStarted });

        } catch (error) {
            reject('findInProgressAndNotStartedTestJobs promise rejected')
            logger.error(error.stack)
        }
        finally {
            await mongoose.connection.close();
        }
    });
}

function findAll(){
    return new Promise( async (resolve, reject) => {
        try {
            await db();
            const jobModel = mongoose.model('Jobs', jobSchema);
            let foundJobs = await jobModel.find({}).sort({ init_date: 'asc'});
            if(foundJobs !== null || foundJobs !== '' ) {
                resolve(foundJobs);
            } else {
                reject('findAll promise rejected');
            }
        } catch (error) {
            logger.error(error.stack);
        }
        finally {
            await mongoose.connection.close();
        } 
    });
}

function getJobFromDb(jobId) {
    return new Promise(async (resolve, reject) =>{
      try{
        await db();
        const jobModel = mongoose.model('Jobs', jobSchema);
        const filter = { jobId: jobId};
        let responseJobs = await jobModel.findOne(filter);
        if(responseJobs !== null || responseJobs !== ''){
          resolve(responseJobs);
        }else{
          reject('getJobFromDb promise rejects');
        }
      }catch (error) {
        logger.error(error.stack);
      } finally {
        await mongoose.connection.close();
      }
    });
   }


module.exports.filterObject = filterObject;
module.exports.findInProgressTestJob = findInProgressTestJob;
module.exports.findAndUpdateJob = findAndUpdateJob;
module.exports.findAll = findAll;
module.exports.getJobFromDb = getJobFromDb;
module.exports.findInProgressAndNotStartedTestJobs = findInProgressAndNotStartedTestJobs;