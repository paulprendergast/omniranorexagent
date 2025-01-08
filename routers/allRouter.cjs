var config = require('config');
const express = require('express');
const allRouter = express.Router();
const db = require('../src/utils/db.cjs');
const utilities = require('../src/utils/utilities.cjs');
const { logger } = require("../src/utils/logger.cjs");
const { jobSchema } = require('../src/models/job.cjs');
const { default: mongoose } = require('mongoose');
const { processStates } = require('../src/states/process.states.cjs');
const { addTestJobToQueue } = require('../src/utils/queues.cjs');

allRouter.route('/')
.get((req,res) => {
    (async function mongooseConnet(){
        await utilities.checkingDatabaseStatus('GET/all AllRouter.cjs');
        try {
            const jobModel = mongoose.model('Jobs', jobSchema);    
            let foundJob = await jobModel.find({});
            logger.debug(foundJob);
            res.status(200).json(foundJob);
            
        } catch (error) {
           logger.error(error.stack);
        }

    }()).catch( err => { logger.error(err);});
}).delete((req,res) => {
    (async () => {
        await utilities.checkingDatabaseStatus('DELETE/ALL AllRouter.cjs');
        try {
            
            const jobModel = mongoose.model('Jobs', jobSchema);
            await jobModel.deleteMany({});

            logger.info('Deleted all Data in Job table');

            res.status(200).end();
        } catch (error) {
            logger.error(error.stack);
        }
        
    })().catch( err => { logger.error(err.stack);});
});

module.exports.allRouter = allRouter;