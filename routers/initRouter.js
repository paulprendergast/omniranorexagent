var config = require('config');
const express = require('express');
const initRouter = express.Router();
const logger = require("../src/utils/logger");
const {MongoClient} = require('mongodb');
const jobInit = require('../src/init/data/jobs.json');
const url =  
    `mongodb+srv://${config.get('dbUserId')}:${config.get('dbUserIdPassword')}@omniranorexagent.ebz0ypr.mongodb.net/?retryWrites=true&w=majority`;

initRouter.route('/').get((req, res) => {

    (async function mongo(){
        let client;
        try {
            client = await MongoClient.connect(url);
            logger.debug('Connected to the mongo DB');
            const db = client.db(config.get('dbName'));
            const response = await db.collection('jobs').insertMany(jobInit);
            res.json(response);

        } catch (error) {
           logger.debug(error.stack);
        }
        client.close();
    }());   
});



module.exports = initRouter;