var config = require('config');
const _ = require('lodash');
const { logger } = require("./logger.cjs");
const { processStates } = require('../states/process.states.cjs');
const node = require('timers/promises');
const fs = require('node:fs');
const path = require('node:path');
const fsPromises = require('node:fs/promises');


function compareTestSet(tOld, tNew) {
    logger.debug(JSON.stringify(tOld));
    logger.debug(JSON.stringify(tNew)); 
    return JSON.stringify(tOld) === JSON.stringify(tNew);
}

function readDirectoryDataAndReturnMap(jobId){
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`Current directory: ${__dirname}`);
            const dirPath = path.join(__dirname, './../../logs/');
            let folders = fs.readdirSync(dirPath);
            logger.debug(`found directory: ${dirPath}`); // directories and 2 files      
            logger.debug(`folder last: ${folders.pop()}`); //remove all.log
            logger.debug(`folder last2: ${folders.pop()}`); //error.log
            logger.debug(`found after two pops: ${folders}`); //all directories
            
            //[{TC12345-09-05-Fail,2024-07-01T09:05:00.000+00:00}]
            let testMapToBirthDate = new Map();
            for(const fold of folders) {
                logger.debug(`folder: ${fold}`);
                let value = await fsPromises.stat(path.join(dirPath, fold));
                logger.debug(`folder: ${fold}: ${value.birthtime}`);
                let newDate = new Date(value.birthtime);
                let modDate = new Date(value.mtime);
                logger.debug(newDate.toString());
                testMapToBirthDate.set(fold, { birthDate: newDate, modDate: modDate });      
            }
            if (testMapToBirthDate.size > 0) {
                resolve(testMapToBirthDate);
            } else {
                reject('readDirectoryDataAndReturnMap return map.size=0.')
            }
        } catch (error) {
            logger.error(error.stack);
        }
    });
}

function findTestsStartAfterTestProcess(processDate, directoryData){
    return new Promise( (resolve, reject) =>{
        try {
            let newMap = new Map();
            for(const [myKey, myValue] of directoryData) {
                const myKeySub = myKey.split('-')[0];//testID
                if(myValue.birthDate.getTime() > processDate.getTime()) {
                    newMap.set(myKeySub, {test: myKey, birthDate: myValue.birthDate, modDate: myValue.modDate });
                }
            }
            if (newMap.size > 0) {
                resolve(newMap);
            } else {
                reject('findTestsStartAfterTestProcess promise failed')
            }
        } catch (error) {
            logger.error(error.stack);
        }
    });
}

function splitTestStatus(dataAfterProcess){
    return new Promise((resolve, reject) =>{
        try {
            const foundTestStatus = new Map();
            const foundTestNoStatus = new Map();
            for( const [myKey, myValue] of dataAfterProcess){
              const myKeySub = myValue.test.includes('-Pass') || myValue.test.includes('-Fail') ||
                                myValue.test.includes('-Crash')? true:false;
              if(myKeySub) {
                foundTestStatus.set(myKey, {test: myValue.test, birthDate: myValue.birthDate, modDate: myValue.modDate });
              }else {
                foundTestNoStatus.set(myKey, {test: myValue.test, birthDate: myValue.birthDate, modDate: myValue.modDate });
              }
            }
            if(foundTestNoStatus.size > 0 || foundTestStatus.size > 0){
                resolve([foundTestNoStatus, foundTestStatus]);
            }else {
                reject('splitTestStatus promise rejected');
            }

        } catch (error) {
            logger.error(error.stack);
        }
    });
}

function buildTestResult(foundTestNoStatus, foundTestStatus, dbTests) {
    return new Promise((resolve, reject) => {
        try {
            let results = new Array();
            //Test has start date, needs workstatus =inprogress, has not finshed or pass/fail
            for(const [myKey, myValue] of foundTestNoStatus) {
              for(const dbTest of dbTests){
                if (myKey === dbTest.testId) { //test has started never finished
                  results.push({
                    testId: dbTest.testId,
                    start_date: myValue.birthDate,
                    finished_date: dbTest.finished_date,
                    workStatus: processStates.InProgress,
                    status: processStates.InProgress
                  });
                  break;
                }
              } 
            }
            //update status for TC test with status
            //Test has finshed, has workstatus = finished and status = pass/fail
            for(const [myKey, myValue] of foundTestStatus) {
              for(const dbTest of dbTests){
                if (myKey === dbTest.testId && dbTest.workStatus !== processStates.Finished) { //test has started never finished
                  let status = "";
                  if (myValue.test.includes('-Pass')) {
                    status = processStates.Pass;
                  } else if(myValue.test.includes('-Fail')) {
                    status = processStates.Fail;
                  } else {
                    status = processStates.Crash;
                  }
                  results.push({
                    testId: dbTest.testId,
                    start_date: myValue.birthDate,
                    finished_date: myValue.modDate,//need this mod date folders
                    workStatus: processStates.Finished,
                    status: status
                  });
                  break;
                }
              }
            }
            logger.debug(`results: ${results}`);
            // get inverse test of intersection and add with changes to new list
            let rTestNames = Array();
            let dbTestNames = Array();
            for (let index = 0; index < results.length; index++) {
              rTestNames.push(results[index].testId);  
            }
            for (let index = 0; index < dbTests.length; index++) {
              dbTestNames.push(dbTests[index].testId);
            }
            const xorName = _.xor(rTestNames,dbTestNames);
            let dbXor = new Array();
            for (let j = 0; j < xorName.length; j++) {
              for (const test of dbTests) {
                if (xorName[j] === test.testId) {
                  dbXor.push({
                    testId: test.testId,
                    start_date: test.start_date,
                    finished_date: test.finished_date,
                    workStatus: test.workStatus,
                    status: test.status
                  });
                  break;
                } 
              }
            }
            
            const newUnOrder = results.concat(dbXor);
            logger.debug(`newUnOrder: ${newUnOrder}`);
            
            // follow DBTests order.
            let newOrder = Array();
            for(const dbTest of dbTests) {
              for(const n of newUnOrder){
                if(dbTest.testId === n.testId){
                  newOrder.push(n);
                  break;
                }
              }        
            }
            logger.debug(`newOrder: ${newOrder}`);
            let dbTestsFormat = Array();
            for(const dbtest of dbTests){
              dbTestsFormat.push({
                testId: dbtest.testId,
                start_date: dbtest.start_date,
                finished_date: dbtest.finished_date,
                workStatus: dbtest.workStatus,
                status: dbtest.status
              })
            }

            if (newOrder.length > 0) {
                resolve([dbTestsFormat, newOrder]);
            } else {
                reject('buildTestResult promise rejected');
            }
        } catch (error) {
            logger.error(error);
        }
    });
}

module.exports.readDirectoryDataAndReturnMap = readDirectoryDataAndReturnMap;
module.exports.compareTestSet = compareTestSet;
module.exports.findTestsStartAfterTestProcess =findTestsStartAfterTestProcess;
module.exports.splitTestStatus = splitTestStatus;
module.exports.buildTestResult = buildTestResult;