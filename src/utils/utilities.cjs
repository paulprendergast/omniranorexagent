var config = require('config');
const _ = require('lodash');
const node = require('timers/promises');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const fsPromises = require('node:fs/promises');
const moment = require("moment");
const momentz = require("moment-timezone");
const dbUtilities = require('./dbUtilities.cjs');
const { logger } = require("./logger.cjs");
const { processStates } = require('../states/process.states.cjs');
const { psGetProcess } = require('./powershellTools.cjs');
const { default: mongoose } = require('mongoose');
const { resolve } = require('path');
const { default: db } = require('./db.cjs');
const retryCrashUtility = require('./retryCrashUtilities.cjs');

function compareTestSet(tOld, tNew) {
    logger.debug(`old: ${JSON.stringify(tOld)}`);
    logger.debug(`new: ${JSON.stringify(tNew)}`); 
    return JSON.stringify(tOld) === JSON.stringify(tNew);
}

function readDirectoryDataAndReturnMap(){
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`Current directory: ${__dirname}`);
            const dirPath = path.join(__dirname, config.get('logWatcherPath'));
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

function getCommandLineProcessId(jobId) {
  return new Promise( async (resolve ,reject) => {
    try {
      await node.setTimeout(config.get('findPwshProcessDelay'));//this put a gap in pwsh starttime: default 61000
      let minuteAfter =  decyferGetProcess(await psGetProcess());
      const testJobProcess = findRunningTestJobProcess(minuteAfter); 
      
      const formatNewDate = momentz.tz(testJobProcess.date, config.get('timeZone'));
      const foundJob = await dbUtilities.findJob(jobId);
      let response = null;
      // store processId in testJob in DB
      if (foundJob.process.id === null && foundJob.process.init_date !== null) {
        //for retryCrash to make history of previous process init_date to exist. but new process can be updated
        //const formatProcessDate = momentz.tz(foundJob.process.init_date, config.get('timeZone'));
        logger.debug(`RetryCrash startup: ${testJobProcess.id} : init_date:${foundJob.process.init_date} UTC: ${new Date(foundJob.process.init_date).toUTCString()}`);
        response = await dbUtilities.findAndUpdateJob(jobId, {process: {id: testJobProcess.id, init_date: new Date(foundJob.process.init_date).toUTCString()} });
      }
      else {
        logger.debug(`Normal startup: ${testJobProcess.id} : init_date:${formatNewDate}`);
        response = await dbUtilities.findAndUpdateJob(jobId, {process: {id: testJobProcess.id, init_date: formatNewDate} });
      }
      
      if(response !== null || response !==''){
        resolve(response);
      }else{
        reject('getCommandLineProcessId promise rejected');
      }     
    } catch (error) {
      logger.error(error.stack);
    }
  });
}

function decyferGetProcess( proccesses) {
  try {
    let newArray = proccesses.raw.split('\n');
    let foundProcesss = _.remove(newArray, n => {
      return n.includes('pwsh');
    });
    
    return foundProcesss;  
  } catch (error) {
    logger.error(error.stack);
  }
 }

 function findRunningTestJobProcess(pAfter) {
  try {
    
    let tempPAfter = new Array();
    for (let index = 0; index < pAfter.length; index++) {
      const element = pAfter[index];
      const foundInner = element.split(' ');
      tempPAfter[index] = {'id':Number(foundInner[0]),'proc':foundInner[1], 'date': new Date(foundInner[2] +" "+ foundInner[3])};        
    }

    //sort inner array by date

    const foundSorted = _.orderBy(tempPAfter,['date'],['desc']);
    const foundTake = _.take(foundSorted,2);
    logger.debug(`found process ${foundTake[1].id}`);// 0 process is the pwsh getProcess; 1 is the sim process
    return foundTake[1];
  } catch (error) {
    logger.error(error.stack);
  }
}

async function watchFolderStatusAndUpdate(jobId, testJob) {
  return new Promise(async(resolve, reject) =>{
    try {
      const directoryData = await readDirectoryDataAndReturnMap();
      logger.debug([...directoryData.entries()]);

      let dbJob = testJob
      ///finds tests started after sim process date.
      // the init_date will come from new testJob or RetryCrash-TestJob
      // the init_date allow function to find all directories come afterward.
      const dataAfterStartedProcess = await findTestsStartAfterTestProcess(dbJob.process.init_date, directoryData);
      logger.debug(`dataAfterStartedProcess: ${dbJob.process.init_date}`);
      //which has status or no status.
      //determines what folder has status  or no status
      const splitStatus = await splitTestStatus(dataAfterStartedProcess);

      //update status for TC  nostatus
      //megerance splitStatus with DBJob. also reoders new result to match DBJob
      const results = await buildTestResult(splitStatus[0], splitStatus[1], dbJob.testGroup);

      // compares DBjobs[0] to found results[1]
      const compareResults = compareTestSet(results[0], results[1]);
      const compareString = compareResults === true? 'Matched-true - tests are not updated to DB': 'UnMatched-false - tests are getting updated to DB';       
      logger.debug(`compareTest: ${compareString}`);
      //return count of TC that do not have status.
      // need to find if all test are complete
      if (results[0].length === results[1].length && !compareResults) {
        //areAllTestsFinished() validate all folders have a status to be completed.
        if(await areAllTestsFinished(dataAfterStartedProcess, dbJob)){
          //Update JobId status = Complete
          logger.debug("watchFolderStatusAndUpdate() work finished correctly");
          const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
          await dbUtilities.findAndUpdateJob(jobId, { status: processStates.Completed, trans_date: completeNewDate, testGroup: results[1] });
        } else {
          logger.debug("watchFolderStatusAndUpdate() work correctly");
          await dbUtilities.findAndUpdateJob(jobId,{testGroup: results[1]});
        } 
      }
      if (!compareResults || compareResults) { //change
        resolve(compareString);
      } else { //no change
        reject('watchFolderStatusAndUpdate promise rejected')
      }

    } catch (error) {
      logger.error(error.stack);
    }
  });
}

function areAllTestsFinished(folder, dbTests) {
  return new Promise((resolve, reject) => {
    let isAllTested = false;
    for(const test of dbTests.testGroup) {
      let found = folder.get(test.testId);
      if(found === undefined) {isAllTested = false; break;}
      if (found.test.includes('-Pass') || found.test.includes('-Fail') || found.test.includes('-Crash')) {
        isAllTested = true;
      } else {
        isAllTested = false;
        break;
      }
    }
    
    if(folder.size !== 0 && dbTests !== null)
      resolve(isAllTested);
    else
      reject('areAllTestsFinished promise rejected');
  });
}

function  checkingDatabaseStatus(location) {
  return new Promise(async (resolve, reject) => {
    const isConnected = await dbUtilities.checkingDatabaseStatusPlusAction();
    const dist = isConnected === true? true: false;
    const string  = isConnected ===true? `DB is still connected: ${location}`: `DB is not connected: ${location}`;
    logger.debug(string);
    resolve(dist);
  });
}



function updateFolderBeforeProcessRetry(testGroup) {
  return new Promise ( async (resolve, reject) =>{
    try {
      const listOfDirectories = await readDirectoryDataAndReturnMap();
      let listOfFoundTests = new Map();
      listOfDirectories.array.forEach((value, key, map) => {
        if(key.includes(testGroup[index])) {
          listOfFoundTests.set(key, value);
        }
      });
      const finalSort = new Map([...listOfFoundTests.entries()].sort((a, b) => a[1].birthDate - b[1].birthDate));
      const firstFolder = finalSort.entries().next().value;
      await fsPromises.rename(firstFolder, `${firstFolder}-${processStates.Crash}`);
      resolve();
    } catch (error) {
        logger.error(error.stack);
        reject('updateFolderForRetry promise rejected');
    }
  });
}

function updateFolderAfterProcessRetry(testGroupValue, dbJobId) {
  return new Promise(async (resolve, reject) => {
    try {
      const listOfDirectories = await readDirectoryDataAndReturnMap();
      const dataAfterStartedProcess = await findTestsStartAfterTestProcess(dbJobId.process.init_date, listOfDirectories);
      if(dataAfterStartedProcess.has(testGroupValue)) {
        const foundFolder = (dataAfterStartedProcess.get(testGroupValue)).test;
        await fsPromises.rename(foundFolder, `${foundFolder}-${processStates.Crash}`);
        resolve();
      }
      reject('updateFolderBeforeProcessRetry promise reject');
    } catch (error) {
      logger.error(error.stack);
    }
  });
}


async function renameCtlogFile() {

  let foundFile = getFilesFromPath(config.get('CtLogFilePath'), '.log');
  foundFile = path.join(config.get('CtLogFilePath'), foundFile[0]);
  let todaysDate = new Date(Date.now());
  todaysDate = formatDate(todaysDate);
  await fsPromises.rename(foundFile, path.join(config.get('CtLogFilePath'),`${todaysDate}.log`));

  let foundFile2 = getFilesFromPath(config.get('CtLogFilePath'), '.txt');
  foundFile2 = path.join(config.get('CtLogFilePath'), foundFile2[0]);
  let todaysDate2 = new Date(Date.now());
  todaysDate2 = formatDate(todaysDate2);
  await fsPromises.rename(foundFile2, path.join(config.get('CtLogFilePath'),`test.${todaysDate2}.txt`));
}

function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [year, month, day].join('');
}

function formatDateTime(date) {
  var d = new Date(date),
      hours = d.getHours(),
      mins = d.getMinutes(),
      sec = d.getSeconds(),
      mil = d.getMilliseconds();

  if (hours.length < 2) 
      hours = '0' + hours;
  if (mins.length < 2) 
      mins = '0' + mins;
  if (sec.length < 2) 
    sec = '0' + sec;
  if (mil.length < 2) 
    mil = '0' + mil;

  return [hours, mins, sec, mil].join(':');
}

function copyCtLogsToProblemTest(distination) {
  const dirPath = path.join(__dirname, config.get('CtLogFilePath'));
  let foundFile = getFilesFromPath(dirPath, '.log');
}

function getFilesFromPath(path, extension) {
  let files = fs.readdirSync( path );
  return files.filter( file => file.match(new RegExp(`.*\.(${extension})`, 'ig')));
}



//after change remember to update exports
module.exports.readDirectoryDataAndReturnMap = readDirectoryDataAndReturnMap;
module.exports.compareTestSet = compareTestSet;
module.exports.findTestsStartAfterTestProcess = findTestsStartAfterTestProcess;
module.exports.splitTestStatus = splitTestStatus;
module.exports.buildTestResult = buildTestResult;
module.exports.getCommandLineProcessId = getCommandLineProcessId;
module.exports.watchFolderStatusAndUpdate =watchFolderStatusAndUpdate;
module.exports.checkingDatabaseStatus = checkingDatabaseStatus;
module.exports.renameCtlogFile = renameCtlogFile;