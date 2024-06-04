var config = require('config');
const express = require('express');
const initRouter = express.Router();
const logger = require("../src/utils/logger");
const {jobSchema } = require('../src/models/job');
const { default: mongoose } = require('mongoose');
const processStates = require('../src/states/process.states');

initRouter.route('/')
  .get((req, res) => {
    (async function mongooseConnet(){
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
                    //res.json(result);
                    //res.redirect(`http://localhost:${config.get("AppPort")}`);
                }).catch((err) =>{
                    logger.debug(err);
                    res.json(err);
                });
            

        } catch (error) {
           logger.debug(error.stack);
        }

    }()).catch( err => { logger.debug(err);});   
}).post((req, res) => {

    //res.json('POST is not implemented');
    //res.json(req.body); //{requestBody: req.body}
    const body = req.body[0];
    (async function mongooseConnet(){
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
                    //res.json(result);
                    //res.redirect(`http://localhost:${config.get("AppPort")}`);
                }).catch((err) =>{
                    logger.debug(err);
                    res.json(err);
                });
        } catch (error) {
           logger.debug(error.stack);
        }

    }()).catch( err => { logger.debug(err);});

}).delete((req, res) => {
    (async () => {
        try {
            const jobModel = mongoose.model('Jobs', jobSchema);
            await jobModel.deleteMany({})
            .then(result => {
                logger.info('Deleted all Data in Job table');
                logger.debug(result);
                //res.json(result);
                //res.redirect(`http://localhost:${config.get("AppPort")}`);

            })
            .catch((err) => {
                logger.debug(err);
                res.json(err);
            });
        } catch (error) {
            logger.debug(error);
        }
        
    })().catch( err => { logger.debug(err);});
    
}).put((req, res) => {
    let body = req.body[0];

    (async function mongooseConnet(){
        try {
            const jobModel = mongoose.model('Jobs', jobSchema);
            const castJobId = new mongoose.Types.ObjectId(body._id)
            const filter = { jobId: castJobId};
            const update = body;      
            await jobModel.findByIdAndUpdate(castJobId, update);
        } catch (error) {
            logger.debug(error);
        }

    })().catch( err => { logger.debug(err);});
});


module.exports = initRouter;