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
const dbUrl =  
    `mongodb+srv://${config.get('dbUserId')}:${config.get('dbUserIdPassword')}@omniranorexagent.ebz0ypr.mongodb.net/?retryWrites=true&w=majority`;



const PORT = config.get("AppPort") || 4001;

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


app.set('views', path.join(__dirname, 'src', 'views'));
app.set('images', path.join(__dirname, 'src', 'images'));
app.set('view engine', 'ejs');

app.use('/init', initRouter);
app.get('/', (req, res) => {
    logger.info("Checking the API status: Everything is OK");
    (async function mongo(){
        let client;
        try {
            client = await MongoClient.connect(dbUrl);
            logger.debug('Connected to the mongo DB');
            const db = client.db(config.get('dbName'));
            const responseJobs = await db.collection('jobs').find().toArray();
            logger.info("test:" + responseJobs[0].testGroup.length);
            //console.log(responseJobs[0]._id);
            res.render('index', {responseJobs});

        } catch (error) {
           logger.debug(error.stack);
        }
        client.close();
    }());   
});

app.listen(PORT, () => {
    logger.info(`Listening on port: ${PORT}`);
});