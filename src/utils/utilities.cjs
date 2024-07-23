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
      
      // store processId in testJob in DB
      const formatNewDate = momentz.tz(testJobProcess.date, config.get('timeZone'));
      const response = await dbUtilities.findAndUpdateJob(jobId, {process: {id: testJobProcess.id, init_date: formatNewDate} });
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
      //Get Latest TestJob update from DB
      //let dbJob = await dbUtilities.getJobFromDb(jobId);
      let dbJob = testJob
      ///finds tests started after sim process date
      const dataAfterStartedProcess = await findTestsStartAfterTestProcess(dbJob.process.init_date, directoryData);
      //which has status or no status.
      const splitStatus = await splitTestStatus(dataAfterStartedProcess);
      //update status for TC  nostatus
      const results = await buildTestResult(splitStatus[0], splitStatus[1], dbJob.testGroup);
      const compareResults = compareTestSet(results[0], results[1]);
      const compareString = compareResults === true? 'Matched-true - tests are not updated to DB': 'UnMatched-false - tests are getting updated to DB';       
      logger.debug(`compareTest: ${compareString}`);
      //return count of TC that do not have status.
      // need to find if all test are complete
      if (results[0].length === results[1].length && !compareResults) {
        if(await areAllTestsFinished(dataAfterStartedProcess, testJob)){
          //Update JobId status = Complete
          const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
          await dbUtilities.findAndUpdateJob(jobId, { status: processStates.Completed, trans_date: completeNewDate, testGroup: results[1] });
        } else {
          logger.debug("watchFolderStatusAndUpdate() work correctly");
          await dbUtilities.findAndUpdateJob(jobId,{testGroup: results[1]});
        } 
      }
      if (!compareResults) { //change
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

// status[status, workStatus]
function updatingTestGroupStatus(index, status, testGroup) {
  return new Promise( async (resolve, reject) => {
    testGroup[index].status = status[0];
    const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
    testGroup[index].finished_date = completeNewDate;
    testGroup[index].workStatus = status[1];
    //change status date
    await dbUtilities.findAndUpdateJob(dbJobId.jobId, { trans_date: completeNewDate,  testGroup: testGroup }); 
    if( testGroup.length === 1){
      resolve();
    }   
    else {
      reject('updatingTestGroupLengthOne Promise reject');
    }   
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

function buildSimulateRetryFolder(test){
  return new Promise( async ( resolve, reject) => {
    try {
      const date = new Date(Date.now());
      const newFolder = `${test}-${date.getHours()}-${date.getMinutes()}`;
      let folderAbsolute = path.join(config.get('logWatcherPath'), newFolder);
      await fsPromises.mkdir(folderAbsolute);
      resolve();
    } catch (error) {
      logger.error(error.stack);
      reject('buildSimulateRetryFolder promise rejected');
    }
  });
}

function buildNewNotStartedTestJobList(dbJobId) {
  return new Promise(async (resolve, reject) => {
    let newTestList = '';
    let testGroup = await buildlTestGroupLiteralObject(dbJobId.testGroup);
    for (let index = 0; index < testGroup.length; index++) {

      if (testGroup[index].workStatus === processStates.NotStarted) { /// first in list. also the first minute

        // if Simulate create folder.
        const isSimulate = dbJobId.testmode.simulate ==='true'?true:false;
        if(isSimulate){
          await buildSimulateRetryFolder(testGroup[index].testId);
        }
        // search CT log for JT crashed and Rebooting
        const foundProblem = await searchCtLogForProblem(testGroup[index].start_date, dbJobId.testmode.simulate);

        if(foundProblem.includes('crash')) {
          if (testGroup.length === 1) { // one test in testgroup
            logger.debug(`First test status = Notstarted and testgroup == 1; newTestList =[] ; update test status = crash`);
            await updatingTestGroupStatus(index, [processStates.Crash, processStates.Crashed], testGroup);
            newTestList = [];
           /*  testGroup[0].status = processStates.Crash;
            const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
            testGroup[0].finished_date = completeNewDate;
            testGroup[0].workStatus = processStates.Crashed
            //change status date
            await dbUtilities.findAndUpdateJob(dbJobId.jobId, { trans_date: completeNewDate,  testGroup: testGroup }); */
            
          } else { // many test in testgroup; in gap before not started and after last test status
            logger.debug(`First test status = Notstarted and testgroup == many  ; newTestList =[shift to many] ; update test status = crash`);
            
            //what if the last test Crashed in the list
            if (index === (testGroup.length - 1)) {
              newTestList = []
            } else {
              newTestList = testGroup.shift();

            }
/*             testGroup[0].status = processStates.Crash;
            const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
            testGroup[0].finished_date = completeNewDate;
            testGroup[0].workStatus = processStates.Crashed
            //change status date
            await dbUtilities.findAndUpdateJob(dbJobId.jobId, { trans_date: completeNewDate,  testGroup: testGroup }); */
            await updatingTestGroupStatus(index, [processStates.Crash, processStates.Crashed], testGroup);
          }
          
          if(dbJobId.process.id ===  null) { // if process data does not exist in DBTestJob. need to go find folder.// change the name for folder to crash
            logger.debug(`First test status = Notstarted; processId == Null; with first minute find latest test folder and give status = Crash`);
            /* const listOfDirectories = await readDirectoryDataAndReturnMap();
            let listOfFoundTests = new Map();
            listOfDirectories.array.forEach((value, key, map) => {
              if(key.includes(testGroup[index])) {
                listOfFoundTests.set(key, value);
              }
            });
            const finalSort = new Map([...listOfFoundTests.entries()].sort((a, b) => a[1].birthDate - b[1].birthDate));
            const firstFolder = finalSort.entries().next().value;
            await fsPromises.rename(firstFolder, `${firstFolder}-${processStates.Crash}`); */
            await updateFolderBeforeProcessRetry(testGroup);
  
          } else { //else find TC folder after process start date. the date wil be in DB. // change the name for folder to crash
            logger.debug(`First test status = Notstarted; processId == notNull; find test folder after process start date and give status = Crash`);
/*             const listOfDirectories = await readDirectoryDataAndReturnMap();
            const dataAfterStartedProcess = await findTestsStartAfterTestProcess(dbJobId.process.init_date, listOfDirectories);
            if(dataAfterStartedProcess.has(testGroup[index])) {
              const foundFolder = (dataAfterStartedProcess.get(testGroup[index])).test;
              await fsPromises.rename(foundFolder, `${foundFolder}-${processStates.Crash}`);
            } */
            await updateFolderAfterProcessRetry(testGroup[index], dbJobId);
            
          } 
          break; // work is done and tests found
        } else { // this means that automation may cause crash.
          logger.warn('Did not find crash; NotStarted; this means that automation may cause crash.');
          if(testGroup.length === 1){ // one test in testgroup
            logger.debug(`First test status = Notstarted and testgroup == 1; newTestList =[] ; update test status = Not Crash`);
            newTestList = []
            /* testGroup[0].status = `*${processStates.Fail}`;
            const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
            testGroup[0].finished_date = completeNewDate;
            testGroup[0].workStatus = processStates.Finished;
            //change status date
            await dbUtilities.findAndUpdateJob(dbJobId.jobId, { trans_date: completeNewDate,  testGroup: testGroup }); */
            await updatingTestGroupStatus( index, ['*' + processStates.Fail, processStates.Finished], testGroup);
          } else { // many test in testgroup

            logger.debug(`First test status = Notstarted and testgroup == many  ; newTestList =[shift to many] ; update test status = Not Crash`);
            newTestList = testGroup.shift();
            /* testGroup[0].status = `*${processStates.Fail}`;
            const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
            testGroup[0].finished_date = completeNewDate;
            testGroup[0].workStatus = processStates.Finished
            //change status date
            await dbUtilities.findAndUpdateJob(dbJobId.jobId, { trans_date: completeNewDate,  testGroup: testGroup }); */
            await updatingTestGroupStatus( index, ['*' + processStates.Fail, processStates.Finished], testGroup);
          }

          if(dbJobId.process.id ===  null){ // if process data does not exist in DBTestJob. need to go find folder.// change the name for folder to crash
            logger.debug(`First test status = Notstarted; processId == Null; with first minute find latest test folder and give status = not Crash`);
            await updateFolderBeforeProcessRetry(testGroup);
          } else { //else find TC folder after process start date. the date wil be in DB. // change the name for folder to crash
            logger.debug(`First test status = Notstarted; processId == notNull; find test folder after process start date and give status = not Crash`);
            await updateFolderAfterProcessRetry(testGroup[index], dbJobId);
          }
        }

        
      
      } else if (testGroup[index].workStatus === processStates.InProgress) { // test in list
        
        // if Simulate create folder.
        const isSimulate = dbJobId.testmode.simulate ==='true'?true:false;
        if(isSimulate){
          await buildSimulateRetryFolder(testGroup[index].testId);
        }
        const foundProblem = await searchCtLogForProblem(testGroup[index].start_date, dbJobId.testmode.simulate);

        if(foundProblem.includes('crash')) {
          if(index === (testGroup.length - 1)) { ///last in list
            newTestList = [];
            //change status date
            // copy over CT logs to test folder
            break;
          } else { //many in list
            newTestList = testGroup.slice(index + 1, testGroup.length);
            //change status date
            // copy over CT logs to test folder
            break;
          }

        } else { // this means that automation may cause crash.
          logger.warn('Did not find crash; InProgress; this means that automation may cause crash.');
          if(index === (testGroup.length - 1)) { ///last in list
            newTestList = [];
            //change status date
            // copy over CT logs to test folder
            break;
          } else { //many in list
            newTestList = testGroup.slice(index + 1, testGroup.length);
            //change status date
            // copy over CT logs to test folder
            break;
          }
        }
  
      } //end of inProgress
    } // end of loop
    if(newTestList === '')
      reject('buildNewNotStartedTestJobList Promose Rejected');
    resolve(newTestList);
  });
}

function buildlTestGroupLiteralObject(testgroup) {
  return new Promise( (resolve, reject) => {
    
    let newObject = [];
    for(const test of testgroup) {
      newObject.push({
        testId: test.testId,
        start_date: test.start_date,
        finished_date: test.finished_date,
        workStatus: test.workStatus,
        status: test.status
      });
    }
    if(newObject.length > 0){
      resolve(newObject);
    } else {
        reject('buildlTestGroupLiteralObject Promise rejected');
    }
  });
}

function searchCtLogForProblem(testStartDate, simulate) {
  return new Promise( async (resolve, reject) => {
    let foundString = 'empty';
    const isSimulate = simulate === 'true'?true:false
    try {
      let newTestStartDate = new Date(testStartDate);
      newTestStartDate = formatDate(newTestStartDate);
      let newTime = null;
      if (isSimulate) { // for simulator
        //newTime = momentz.tz(testStartDate, config.get('timeZone')).format('HH:mm:ss:SS');
        newTime = () => {
          return new Promise( async (resolve, reject) => {
            let foundFile = getFilesFromPath(config.get('CtLogFilePath'), '.log');
            let exactFiles = [];
            foundFile.forEach((s) => { //search for exactFiles by dateformat
              if(s.includes(newTestStartDate)){
                exactFiles.push(s);
              }
            });
            
            const dirPathFile = path.join(config.get('CtLogFilePath'), exactFiles[0]);
            const fileStream = fs.createReadStream(dirPathFile);
  
            const rl = readline.createInterface({
              input: fileStream,
              crlfDelay: Infinity,
            });
            // Note: we use the crlfDelay option to recognize all instances of CR LF
            // ('\r\n') in input.txt as a single line break.
            let count = 0;
            let foundLine = '';
            for await (const line of rl) {
              if (count === 4) {
                foundFile = line.split(' ');
                foundFile = foundFile[0];
                foundFile = foundFile.split('\t');
                foundFile = foundFile[4];
                break;
              }
              count++;
            }

            rl.close();

            if (foundFile.includes(':')) {
              resolve(foundFile);
            } else {
              reject('searchCtLogForProblem sim newTime Promise Rejected');
            }
 
          }); //promise
        };

        const foundTime = (await newTime()).split(':');
        //new Date(year, monthIndex, day, hours, minutes, seconds, milliseconds)
        const splitSecMil = foundTime[2].split('.');
        const buildNewDate = new Date(testStartDate.getFullYear(), testStartDate.getMonth(), testStartDate.getDay(), foundTime[0], foundTime[1], splitSecMil[0], splitSecMil[1]);
        newTime = momentz.tz(buildNewDate, config.get('timeZone')).format('HH:mm:ss:SS')
      } else { // for non- simulator
        newTime = momentz.tz(testStartDate, config.get('timeZone')).format('HH:mm:ss:SS');// folder create birthdate
      }
      //let newtime = momentz.tz(testStartDate, config.get('timeZone')).format('HH:mm:ss:SS')
      logger.debug(`time: ${newTime}`);
      
      

      let foundFile = getFilesFromPath(config.get('CtLogFilePath'), '.log');
      let exactFiles = [];
      foundFile.forEach((s) => { //search for exactFiles by dateformat
        if(s.includes(newTestStartDate)){
          exactFiles.push(s);
        }
      });
      
      for(const file of exactFiles) {
        const dirPathFile = path.join(config.get('CtLogFilePath'), file);
        logger.debug(`found CT log file: ${file}`);

        const fileStream = fs.createReadStream(dirPathFile);
  
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });
        // Note: we use the crlfDelay option to recognize all instances of CR LF
        // ('\r\n') in input.txt as a single line break.
        const logErrors = ['JT Crashed', 'Exception']
        for await (const line of rl) {
          // Each line in input.txt will be successively available here as `line`.
          logger.debug(`line: ${line}`);
          if ( await readLineTime(line, testStartDate) > newTime) {
            if(line.includes(logErrors[0])){
              foundString = 'crash';
              break;
            } 
          }
        }
        rl.close();

        if(foundString.includes('crash'))
            break;
      }
      logger.info(`Finished searching CT log and found: ${foundString}`);
      resolve(foundString);

    } catch (error) {
      logger.error(error.stack);
      reject('searchCtLogForProblem promise rejected.');
    }
  });
}

function readLineTime( lineTime, testStartDate){
  return new Promise((resolve, reject) => {
    let newTime = null;
    try {
      let foundFile = lineTime.split(' ');

      //logger.debug(`foundFile: $${foundFile}`);
      //logger.debug(`foundFile: $${foundFile[1]}`);
      let foundFile2 = foundFile[0];
      
      //logger.debug(`foundFile2: $${foundFile2}`);
      let foundFile3 = foundFile2.split('\t');
      //logger.debug(`foundFile3: $${foundFile3}`);
      let foundFile4 = foundFile3[4].split(':');  
      //.debug(`foundFile4: $${foundFile4}`);
      const splitSecMil = foundFile4[2].split('.'); 
      //logger.debug(`splitSecMil: $${foundFile3}`);     
      const buildNewDate = new Date(testStartDate.getFullYear(), testStartDate.getMonth(), testStartDate.getDay(), foundFile4[0], foundFile4[1], splitSecMil[0], splitSecMil[1]);
      newTime = momentz.tz(buildNewDate, config.get('timeZone')).format('HH:mm:ss:SS'); 
    } catch (error) {
      logger.error(error.stack);
    } 
    if (newTime !== moment.invalid) {
      resolve(newTime)
    } else {
      reject('readLineTime promise rejected');
    } 
  });
}
async function renameCtlogFile() {

  let foundFile = getFilesFromPath(config.get('CtLogFilePath'), '.log');
  foundFile = path.join(config.get('CtLogFilePath'), foundFile[0]);
  let todaysDate = new Date(Date.now());
  todaysDate = formatDate(todaysDate);
  await fsPromises.rename(foundFile, path.join(config.get('CtLogFilePath'),`${todaysDate}.log`));
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
module.exports.buildNewNotStartedTestJobList = buildNewNotStartedTestJobList;
module.exports.renameCtlogFile = renameCtlogFile;