var config = require('config');
const express = require('express');
const initRouter = express.Router();
const db = require('../src/utils/db.cjs');
const utilities = require('../src/utils/utilities.cjs');
const { logger } = require("../src/utils/logger.cjs");
const { jobSchema } = require('../src/models/job.cjs');
const { default: mongoose } = require('mongoose');
const { processStates } = require('../src/states/process.states.cjs');
const { addTestJobToQueue } = require('../src/utils/queues.cjs');

initRouter.route('/all')
.get((req,res) => {
    (async function mongooseConnet(){
        await utilities.checkingDatabaseStatus('GET/all InitRouter.cjs');
        try {
            const jobModel = mongoose.model('Jobs', jobSchema);    
            let foundJob = await jobModel.find({});
            logger.debug(foundJob);
            res.status(200).json(foundJob);
            
        } catch (error) {
           logger.error(error.stack);
        }

    }()).catch( err => { logger.error(err);});
});


initRouter.route('/')
.get((req, res) => {
    let foundJobId = req.query.jobId;
    (async function mongooseConnet(){
        await utilities.checkingDatabaseStatus('GET/ InitRouter.cjs');
        try {
                const jobModel = mongoose.model('Jobs', jobSchema);
                const castJobId = new mongoose.Types.ObjectId(foundJobId)
                const filter = { jobId: castJobId};     
                let foundJob = await jobModel.findOne(filter);
                logger.debug(foundJob);
                res.status(200).json(foundJob);
            
        } catch (error) {
           logger.error(error.stack);
        }

    }()).catch( err => { logger.error(err);});  
    
}).post((req, res) => {

    const body = req.body[0];
    (async function mongooseConnet(){
        await utilities.checkingDatabaseStatus('POST InitRouter.cjs');
        try {
            const jobModel = mongoose.model('Jobs', jobSchema);
    
            let objectJobModel = new jobModel();
            objectJobModel.jobId = new mongoose.Types.ObjectId(body.jobId);//'65eb7fdcfc7ee7c6f99b869d');
            objectJobModel.parentJobId = new mongoose.Types.ObjectId(body.parentJobId);//'65eb7fdcfc7ee7c6f99b869d');
            objectJobModel.jobType = body.jobType;
            objectJobModel.machineName = body.machineName;
            objectJobModel.agentIp = body.agentIp;
            objectJobModel.init_date = body.init_date;
            objectJobModel.trans_date = body.trans_date;
            objectJobModel.status = body.status;
            objectJobModel.agentData = {
                testSuiteType: body.agentData.testSuiteType,
                simulatorConfig: body.agentData.simulatorConfig,
                simulatorPath: body.agentData.simulatorPath,
                omnicenterIp: body.agentData.omnicenterIp,
                ctip: body.agentData.ctip,
            },
            objectJobModel.process = {
                id: body.process.id,
                init_date: body.process.init_date
            },
            objectJobModel.testmode = {
                enabled: body.testmode.enabled,
                simulate: body.testmode.simulate,
            };

            for (let i = 0; i < body.testGroup.length; i++) {
                    
                objectJobModel.testGroup.push(
                {
                    testId: body.testGroup[i].testId,
                    start_date: body.testGroup[i].start_date,
                    finished_date: body.testGroup[i].finished_date,
                    workStatus: body.testGroup[i].workStatus,
                    status: body.testGroup[i].status
                });  
            }

            await objectJobModel.save()
                .then((result) => {
                    logger.info('Data Inserted');
                    logger.debug(result);
                }); 

            const queueBehaviors = config.get('testmode.queueBehaviors') ==="true"?true:false;
            const queueByPass = config.get('testmode.byPassQueue') ==="true"?true:false;
            if (queueBehaviors || queueByPass) {
                addTestJobToQueue(objectJobModel);
            }
           
            res.status(200).end();
            
        } catch (error) {
           logger.error(error.stack);
        }
               

    }()).catch( err => { logger.error(err.stack);});

}).delete((req, res) => {

    (async () => {
        await utilities.checkingDatabaseStatus('DELETE InitRouter.cjs');
        try {
                const jobModel = mongoose.model('Jobs', jobSchema);
                await jobModel.deleteMany({});
           
            
            logger.info('Deleted all Data in Job table');

            res.status(200).end();
        } catch (error) {
            logger.error(error.stack);
        }
        
    })().catch( err => { logger.error(err.stack);});
    
}).put((req, res) => {
    let foundJobId = req.query.jobId;
    let body = req.body;


    (async function mongooseConnet(){
        await utilities.checkingDatabaseStatus('PUT InitRouter.cjs');
        try {
                const jobModel = mongoose.model('Jobs', jobSchema);
                const castJobId = new mongoose.Types.ObjectId(foundJobId)
                const filter = { jobId: castJobId};
                const update = body;      
                await jobModel.findOneAndUpdate(filter, update);

            res.status(200).end();
        } catch (error) {
            logger.error(error);
        }

    })().catch( err => { logger.error(err.stack);});
});


module.exports.initRouter = initRouter;