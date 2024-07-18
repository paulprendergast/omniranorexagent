var config = require('config');
const mongoose = require('mongoose');
const { logger } = require("./logger.cjs");

const dbUrl =  
    `mongodb+srv://${config.get('dbUserId')}:${config.get('dbUserIdPassword')}@omniranorexagent.ebz0ypr.mongodb.net/agent?retryWrites=true&w=majority`;

//const PORT = config.get("AppPort") || 4051;

module.exports = () => {
    
    mongoose.connection.on('error',(error) => logger.error("Mongoose DB connection error: " + error));
    //mongoose.connection.on('open', () => logger.info('Mongoose DB open'));
    //mongoose.connection.on('disconnected', () => logger.info('Mongoose DB disconnected'));
    //mongoose.connection.on('reconnected', () => logger.info('Mongoose DB reconnected'));
    //mongoose.connection.on('disconnecting', () => logger.info('Mongoose DB disconnecting'));
    //mongoose.connection.on('close', () => logger.info('Mongoose DB close'));
    mongoose.connection.once('open',() => {

        logger.info('Connected to the mongo DB via Mongoose');
    });

    return new Promise(async (resolve, reject) =>{
        mongoose.connect(dbUrl, {
            maxPoolSize: 50, 
            wtimeoutMS: 2500,
            serverSelectionTimeoutMS: 35000,
        }).then(() => {
            resolve(mongoose);
    
        }).catch(err => {
            logger.debug(err.stack);
            reject('Mongoose DB Promise Connection Rejected');
        });
    });
};