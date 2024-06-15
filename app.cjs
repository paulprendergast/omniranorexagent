var config = require('config');
process.env.NODE_ENV = config.get("NODE_ENV");
const express = require('express');
const path = require('path');
const chalk = require('chalk');
const debug = require('debug')('app');
const app = express();
const { morganMiddleware } = require("./src/middleware/morgan.middleware.cjs");
const { logger } = require("./src/utils/logger.cjs");
const { initRouter } = require('./routers/initRouter.cjs');
const { MongoClient } = require('mongodb');
//const { default: mongoose } = require('mongoose');
const db = require('./src/utils/db.cjs');
const { jobSchema } = require('./src/models/job.cjs');
const { exceptions } = require('winston');
const bodyParser = require('body-parser');
const utilities = require('./src/utils/utilities.cjs');
const _ = require('lodash');
const { processStates } = require('./src/states/process.states.cjs');
const { connectionDB } = require('./src/utils/db.cjs');
//const { default: mongoose } = require('mongoose');
const { obliterateJobsQueue } = require('./src/utils/queues.cjs');



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
            let responseJobs ='';
            await db().then(async mongoose => {
                try {
                    logger.debug('Loading All Jobs');
                    const jobModel = mongoose.model('Jobs', jobSchema);
                    responseJobs = await jobModel.find({}).sort({ init_date: 'asc'}).exec();
                    
                }catch (error) {
                    console.log(error.stack);
                }finally {
                    mongoose.connection.close();
                }
            }).catch(err =>{ 
                logger.error(err.stack);
            });

            if (responseJobs instanceof Array) {

                newFilterJobs = await utilities.filterObject(responseJobs);
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
        
    }()).catch( err => { 
        logger.error(err.stack);});   
});

app.listen(PORT, () => {
    logger.info(`Listening on port: ${PORT}`);
});
obliterateJobsQueue();