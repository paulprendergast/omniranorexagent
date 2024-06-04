var config = require('config');
process.env.NODE_ENV = config.get("NODE_ENV");
const express = require('express');
const path = require('path');
const chalk = require('chalk');
const debug = require('debug')('app');
const app = express();
const morganMiddleware = require("./src/middleware/morgan.middleware");
const logger = require("./src/utils/logger");
const initRouter = require('./routers/initRouter');
const {MongoClient} = require('mongodb');
const { default: mongoose } = require('mongoose');
const {jobSchema } = require('./src/models/job');
const { exceptions } = require('winston');
const bodyParser = require('body-parser');
const processRoute = require('./src/utils/process.route');
const utilities = require('./src/utils/utilities');
const _ = require('lodash');
const processStates = require('./src/states/process.states');


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

app.use('/init', initRouter);
app.get('/', (req, res) => {
    logger.info("Checking the API status: Everything is OK");
    let newFilterJobs = [];
    (async function firstMongooseGet(){
        try {
            logger.debug('Loading All Jobs');           
            const jobModel = mongoose.model('Jobs', jobSchema);
            let responseJobs = await jobModel.find({}).sort({ init_date: 'asc'}).exec();
            if (responseJobs instanceof Array) {

                newFilterJobs = await utilities.filterObject(responseJobs);
                res.render('index', {newFilterJobs});
            } else {
                const newError = "The responseJobs did not return Array."; 
                logger.debug(newError);
                throw new Error(newError); 
            }                   
        } catch (error) {
            logger.debug(error.stack);
        }
        
    }()).catch( err => { 
        logger.debug(err);});   
});

try {
    mongoose.connect(dbUrl, {
        maxPoolSize: 10, 
        wtimeoutMS: 2500
    }).catch(error => logger.debug(`Mongoose DB connect: ${error}`));
    mongoose.connection.on('error',(error) => logger.error("Mongoose DB connection error: " + error));
    mongoose.connection.on('open', () => logger.info('Mongoose DB open'));
    mongoose.connection.on('disconnected', () => logger.info('Mongoose DB disconnected'));
    mongoose.connection.on('reconnected', () => logger.info('Mongoose DB reconnected'));
    mongoose.connection.on('disconnecting', () => logger.info('Mongoose DB disconnecting'));
    mongoose.connection.on('close', () => logger.info('Mongoose DB close'));
    mongoose.connection.once('open',() => {

        logger.info('Connected to the mongo DB via Mongoose');
        app.listen(PORT, () => {
            logger.info(`Listening on port: ${PORT}`);
        });
    });
} catch (error) {
    logger.debug(`Mongoose DB connect: ${error}`);
} 