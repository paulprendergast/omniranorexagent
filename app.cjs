var config = require('config');
process.env.NODE_ENV = config.get("NODE_ENV");
const express = require('express');
const path = require('path');
const chalk = require('chalk');
const debug = require('debug')('app');
const app = express();
const db = require('./src/utils/db.cjs');
const bodyParser = require('body-parser');
const dbUtilities = require('./src/utils/dbUtilities.cjs');
const utilities = require('./src/utils/utilities.cjs');
const _ = require('lodash');
const { morganMiddleware } = require("./src/middleware/morgan.middleware.cjs");
const { logger } = require("./src/utils/logger.cjs");
const { initRouter } = require('./routers/initRouter.cjs');
const { MongoClient } = require('mongodb');
const { jobSchema } = require('./src/models/job.cjs');
const { exceptions } = require('winston');
const { processStates } = require('./src/states/process.states.cjs');
//const { findInProgressTestJob } = require('./src/utils/db.cjs');
const { default: mongoose } = require('mongoose');
const { obliterateJobsQueue } = require('./src/utils/queues.cjs');
require('events').EventEmitter.defaultMaxListeners = 25;



const dbUrl =  
    `mongodb+srv://${config.get('dbUserId')}:${config.get('dbUserIdPassword')}@omniranorexagent.ebz0ypr.mongodb.net/agent?retryWrites=true&w=majority`;

const PORT = config.get("AppPort") || 4051;
let responseJobs="";

loggerMode = "";
if (process.env.NODE_ENV === 'development') {
   
    logger.debug(`Log level set: Debug mode`);
}
if (process.env.NODE_ENV === 'production') {
    logger.info(`Log level set: ${config.get("LogLevel")}`);
}
logger.info(`Running in mode: ${process.env.NODE_ENV}`);
//middleware
app.use(express.static(path.join(__dirname, '/src/')));
//app.use(morgan('tiny'));
app.use(morganMiddleware);
//app.use(bodyParser); deprecated
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.set('views', path.join(__dirname, 'src', 'views'));
app.set('images', path.join(__dirname, 'src', 'images'));
app.set('view engine', 'ejs');

//connectionDB();
app.use('/init', initRouter);

app.get('/', (req, res) => {
    logger.info("Checking the API status: Everything is OK");
    let newFilterJobs = [];
    (async function firstMongooseGet(){
        
        try {
            await utilities.checkingDatabaseStatus('GET app.cjs');
            let responseJobs = await dbUtilities.findAll();

            if (responseJobs instanceof Array) {

                newFilterJobs = await dbUtilities.filterObject(responseJobs);
                res.render('index', {newFilterJobs});
            } else {
                const newError = "The responseJobs did not return Array."; 
                logger.error(newError);
                throw new Error(newError); 
            } 
            res.status(200).end();             
        } catch (error) {
            logger.error(error.stack);
        }
        finally {
            const foundStates = await dbUtilities.findInProgressAndNotStartedTestJobs();
            if(!foundStates.notStartedExist && !foundStates.inProgressExist) {
                mongoose.connection.close();
            }
        }
        
    }()).catch( err => { 
        logger.error(err.stack);});   
});

app.listen(PORT, () => {
    logger.info(`Listening on port: ${PORT}`);
});



const queueBehaviors = config.get('testmode.queueBehaviors') ==="true"?true:false;
if (queueBehaviors) {   
    obliterateJobsQueue();
}
const byPassQueue = config.get('testmode.byPassQueue') === "true"?true:false;
if(byPassQueue){
    utilities.renameCtlogFile();
}


