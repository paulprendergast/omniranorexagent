var config = require('config');
process.env.NODE_ENV = config.get("NODE_ENV");
const express = require('express');
const path = require('path');
const chalk = require('chalk');
const debug = require('debug')('app');
const app = express();
const morganMiddleware = require("./src/middleware/morgan.middleware");
const logger = require("./src/utils/logger");


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

app.get('/', (req, res) => {
    logger.info("Checking the API status: Everything is OK");
    
    res.render('index');
});

app.listen(PORT, () => {
    logger.info(`Listening on port: ${PORT}`);
});