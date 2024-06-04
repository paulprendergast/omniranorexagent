var config = require('config');
const {jobSchema } = require('../models/job');
const { default: mongoose } = require('mongoose');
const logger = require("./logger");
const utilities = require('./utilities');
const processStates = require('../states/process.states');
const { expose} = require('threads');
const dbUrl =  
    `mongodb+srv://${config.get('dbUserId')}:${config.get('dbUserIdPassword')}@omniranorexagent.ebz0ypr.mongodb.net/agent?retryWrites=true&w=majority`;
const jobModel = mongoose.model('Jobs', jobSchema);

mongoose.connection.on('error',(error) => logger.error("Mongoose DB connection error: " + error));
mongoose.connection.on('open', () => logger.info('Mongoose DB open in worker.'));
mongoose.Promise = global.Promise;

let finalReturn = {};
mongoose.connect(dbUrl, {maxPoolSize: 10, wtimeoutMS: 2500});

const commandWorker = {

    callRemoteCommand(config, job) {
        
        (async function() {
            logger.debug('inside worker');
            
            
            try {
                
                let theJob = JSON.parse(job);
                if (config.testmode) {
                    logger.debug('TestMode is Enabled');
            
                    if (config.testSimulate) {
                        logger.debug('TestMode Simulate is enabled');
                        
                        logger.info(`jobId: ${theJob.jobId} has been selected and stating to work with worker.`);
                        

                        updateJobStatus(theJob, processStates.InProgress);
                        logger.debug('starting timeout');
                        setTimeout(function(){
                            logger.debug("Hello World");
                        }, 120000);
                        finalReturn = {testSimulate: config.testSimulate};
                        
                        
            
                    } else {
                        logger.debug('TestMode Simulate is disabled');
                        logger.debug('Bipass will happen to TestMode Simulate disabled');
                        finalReturn = {biPass: true};
                    }
                        
                } else {
                    logger.debug('TestMode is Disabled');
                    logger.info('Live Mode');
                    logger.info(`jobId: ${theJob.jobId} has been selected and stating to work with worker.`);
                    updateJobStatus(theJob, processStates.InProgress);

                    finalReturn = {live: true};                 
                }
            } catch (error) {
                logger.debug({error: error , stack: error.stack});
            } 
        }());     
    },
    

};

async function updateJobStatus(theJob, status){

    try {
        const castJobId = new mongoose.Types.ObjectId(theJob._id)
        const update = {status: status};      
        await jobModel.findByIdAndUpdate(castJobId, update,{new: true});
        
    } catch (error) {
        logger.debug({error: error , stack: error.stack});
    } 
}



expose( commandWorker );