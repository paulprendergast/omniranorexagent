var config = require('config');
const express = require('express');
const initRouter = express.Router();
const db = require('../src/utils/db.cjs');
const { logger } = require("../src/utils/logger.cjs");
const { jobSchema } = require('../src/models/job.cjs');
//const { default: mongoose } = require('mongoose');
const { processStates } = require('../src/states/process.states.cjs');
const { addTestJobToQueue } = require('../src/utils/queues.cjs');

initRouter.route('/all')
.get((req,res) => {
    (async function mongooseConnet(){
        try {
            await db().then(async mongoose =>{
                try {
                    const jobModel = mongoose.model('Jobs', jobSchema);    
                    let foundJob = await jobModel.find({});
                    logger.debug(foundJob);
                    res.status(200).json(foundJob);
                   
                } catch (error) {
                    logger.error(error.stack);
                } finally {
                    mongoose.connection.close();
                }
            }).catch( err => {
                logger.error(err.stack);
            });           
            
        } catch (error) {
           logger.error(error.stack);
        }

    }()).catch( err => { logger.error(err);});
});


initRouter.route('/')
.get((req, res) => {
    let foundJobId = req.query.jobId;
    (async function mongooseConnet(){
        try {
            await db().then(async mongoose =>{
                try {
                    const jobModel = mongoose.model('Jobs', jobSchema);
                    const castJobId = new mongoose.Types.ObjectId(foundJobId)
                    const filter = { jobId: castJobId};     
                    let foundJob = await jobModel.findOne(filter);
                    logger.debug(foundJob);
                    res.status(200).json(foundJob);
                   
                } catch (error) {
                    logger.error(error.stack);
                } finally {
                    mongoose.connection.close();
                }
            }).catch( err => {
                logger.error(err.stack);
            });           
            
        } catch (error) {
           logger.error(error.stack);
        }

    }()).catch( err => { logger.error(err);});  
    /* (async function mongooseConnet(){
        try {
            await db().then(async mongoose =>{
                try {
                    const jobModel = mongoose.model('Jobs', jobSchema);
 
                    let objectJobModel = new jobModel();
                    objectJobModel.jobId = new mongoose.Types.ObjectId();//'16139755-83f6-4f0e-9f5b-d6c9b1789b99');
                    objectJobModel.parentJobId = new mongoose.Types.ObjectId();//'593712f9-d221-4ba7-b96b-955f64f1c553');
                    objectJobModel.jobType = 'Test';
                    objectJobModel.machineName = 'LTAWSDIST193176';
                    objectJobModel.agentIp = '10.116.222.1';
                    objectJobModel.init_date = '2023-12-03T01:00:00.000+00:00';
                    objectJobModel.trans_date = '2023-12-03T06:00:00.000+00:00';
                    objectJobModel.status = processStates.Completed;
                    objectJobModel.agentData = {
                            testSuiteType: 'OCCTDist',
                            simulatorConfig: 'AWS',
                            simulatorPath: 'c:\\Program Files (x86)\\OETS\\',
                            omnicenterIp: '10.6.198.201',
                            ctip: '10.6.196.88',
                        },
                        objectJobModel.testmode = {
                            enabled: 'true',
                            simulate: 'false',
                        };
                    objectJobModel.testGroup = [
                         {
                            testId: 'TC12345',
                            start_date: '2023-12-03T01:00:00.000+00:00',
                            finished_date: '2023-12-03T06:00:00.000+00:00',
                            workStatus: 'Finished',
                            status: 'Pass'
                         },
                         {
                            testId:"TC67890",
                            start_date: "2023-12-03T01:00:00.000+00:00",
                            finished_date: "2023-12-03T06:00:00.000+00:00",
                            workStatus: "Finished",
                            status: "Pass"
                        },
                        {
                            testId:"TC13579",
                            start_date: "2023-12-03T01:00:00.000+00:00",
                            finished_date: "2023-12-03T06:00:00.000+00:00",
                            workStatus: "Finished",
                            status: "Fail"
                        }
                    ];
        
                    await objectJobModel.save()
                        .then((result) => {
                            logger.info('Data Inserted');
                            logger.debug(result);
                            
                        });
                } catch (error) {
                    logger.error(error.stack);
                } finally {
                    mongoose.connection.close();
                }
            }).catch( err => {
                logger.error(err.stack);
            });           
            res.status(200).end();
        } catch (error) {
           logger.error(error.stack);
        }

    }()).catch( err => { logger.error(err);});   */
}).post((req, res) => {

    //res.json('POST is not implemented');
    //res.json(req.body); //{requestBody: req.body}
    const body = req.body[0];
    (async function mongooseConnet(){
        try {
            await db().then(async mongoose =>{
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
                } catch (error) {
                    console.error(error.stack);
                } finally {
                    mongoose.connection.close();
                }
            }).catch(err =>{
                logger.error(err.stack);
            });

            res.status(200).end();
            
        } catch (error) {
           logger.error(error.stack);
        }
               

    }()).catch( err => { logger.error(err.stack);});

}).delete((req, res) => {
    (async () => {
        try {
           
            await db().then(async mongoose => {
                try {
                    const jobModel = mongoose.model('Jobs', jobSchema);
                    await jobModel.deleteMany({});
                } catch (error) {
                    logger.error(error.stack);
                } finally {
                    mongoose.connection.close();
                }
            }).catch(err => {
                logger.error(err.stack);
            });
            logger.info('Deleted all Data in Job table');
            //logger.debug(result);
            //res.json(result);
            //res.redirect(`http://localhost:${config.get("AppPort")}`);
            res.status(200).end();
        } catch (error) {
            logger.error(error.stack);
        }
        
    })().catch( err => { logger.error(err.stack);});
    
}).put((req, res) => {
    let foundJobId = req.query.jobId;
    let body = req.body;


    (async function mongooseConnet(){
        try {

            await db().then(async mongoose => {
                try {
                    const jobModel = mongoose.model('Jobs', jobSchema);
                    const castJobId = new mongoose.Types.ObjectId(foundJobId)
                    const filter = { jobId: castJobId};
                    const update = body;      
                    await jobModel.findOneAndUpdate(filter, update);
                } catch (error) {
                    logger.error(error.stack);
                } finally {
                    mongoose.connection.close();
                }
            }).catch(err => {
                logger.error(err.stack);
            });

            res.status(200).end();
        } catch (error) {
            logger.error(error);
        }

    })().catch( err => { logger.error(err.stack);});
});


module.exports.initRouter = initRouter;