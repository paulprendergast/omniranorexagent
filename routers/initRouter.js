var config = require('config');
const express = require('express');
const initRouter = express.Router();
const logger = require("../src/utils/logger");
const {jobSchema } = require('../src/models/job');
const { default: mongoose } = require('mongoose');

initRouter.route('/').get((req, res) => {

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
            objectJobModel.status = 'Finished';
            objectJobModel.agentData = {
                    testSuiteType: 'OCCTDist',
                    simulatorConfig: 'AWS',
                    simulatorPath: 'c:\\Program Files (x86)\\OETS\\',
                    omnicenterIp: '10.6.198.201',
                    ctip: '10.6.196.88',
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
                    res.json(result);
                }).catch((err) =>{
                    logger.debug(err);
                    res.json(err);
                });
            

        } catch (error) {
           logger.debug(error.stack);
        }

    }());   
});



module.exports = initRouter;