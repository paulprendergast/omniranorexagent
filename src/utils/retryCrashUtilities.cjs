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
const utilities = require('./utilities.cjs');
const { logger } = require("./logger.cjs");
const { processStates } = require('../states/process.states.cjs');
const { psGetProcess } = require('./powershellTools.cjs');
const { default: mongoose } = require('mongoose');
const { resolve } = require('path');
const { default: db } = require('./db.cjs');

function buildSimulateRetryFolder(test, startDate){
  return new Promise( async ( resolve, reject) => {
    try {
      const date = new Date(startDate);
      //const date = formatDate(testStartDate);
      const newFolder = `${test}-${date.getHours()}-${date.getMinutes()}`;//this will skip the folder watcher
      let folderAbsolute = path.join(config.get('testmode.retryLogPath'), newFolder);
      const createdFolder = await fsPromises.mkdir(folderAbsolute);
      resolve();
    } catch (error) {

      if(error.code === 'EEXIST') {
        logger.error(`buildSimulateRetryFolder Directory already exists ${newFolder}`);
        reject('buildSimulateRetryFolder Directory already exists');
      } else {
        logger.error(error.stack);
        reject('buildSimulateRetryFolder promise rejected');
      }
      
    }
  });
}

function buildSimulatePreTestFolders(count, testGroup, init_date){
  return new Promise( async ( resolve, reject) => {
    try {

      //for loop is if statement
      for (let i = 0; i < count; i++) {
        let date = new Date(init_date);
        if (i >= 1) {// two or more test get time change
          let date2 = new Date(init_date);
          date2.setMinutes ( date.getMinutes() + 1 );
          date = date2;
        }
        let test = testGroup[i].testId;
        const newFolder = `${test}-${date.getHours()}-${date.getMinutes()}-${testGroup[i].status}`;//this will skip the folder watcher
        const folderAbsolute = path.join(config.get('testmode.retryLogPath'), newFolder);
        await fsPromises.mkdir(folderAbsolute);        
      }
      resolve();
      
    } catch (error) {

      if(error.code === 'EEXIST') {
        logger.error(`buildSimulatePreTestFolders Directory already exists ${newFolder}`);
        reject('buildSimulatePreTestFolders Directory already exists');
      } else {
        logger.error(error.stack);
        reject('buildSimulatePreTestFolders promise rejected');
      }
    }
  });
}

function updateCrashTestCaseFolder(foundJob) {
  return new Promise( async ( resolve, reject) => {
    try {
      const foundCrashes = await getCrashTestAndFolders(foundJob);
      const foundCrash = foundCrashes[0];  
      const dataAfterStartedProcess = foundCrashes[1];

      //rename append '-crash' to folder name
      foundCrash.forEach( (crashTest) => {
        let testMatchDir = dataAfterStartedProcess.get(crashTest.testId);
        if (!testMatchDir.test.includes('Crash') && !testMatchDir.test.includes('Pass') && !testMatchDir.test.includes('Fail')) {
          const newFolder = `${testMatchDir.test}-Crash`;//this will skip the folder watcher
          const oldFolderAbsolute = path.join(config.get('testmode.retryLogPath'), testMatchDir.test);
          const newFolderAbsolute = path.join(config.get('testmode.retryLogPath'), newFolder);
          fs.renameSync(oldFolderAbsolute, newFolderAbsolute);
        }
      });
       resolve();
      
    } catch (error) {

      if(error.code === 'EEXIST') {
        logger.error(`buildSimulatePreTestFolders Directory already exists ${newFolder}`);
        reject('buildSimulatePreTestFolders Directory already exists');
      } else {
        logger.error(error.stack);
        reject('buildSimulatePreTestFolders promise rejected');
      }
    }
  });
}

function getCrashTestAndFolders(foundJob) {
  return new Promise( async ( resolve, reject) => {
    try {
      //find crash TC in TestGroup
      let foundCrash = [];
      foundJob.testGroup.forEach( (test) => {
        if (test.status === "Crash") {
          foundCrash.push(test);
        }
      });

      if (foundCrash.length === 0) {
        reject(`getCrashTestAndFolders Promise failed`);
      } else {
        //find TC-folder in /logs
        const directoryData = await utilities.readDirectoryDataAndReturnMap();
        const dataAfterStartedProcess = await utilities.findTestsStartAfterTestProcess(foundJob.process.init_date, directoryData);
        
        resolve([foundCrash, dataAfterStartedProcess]);
      }
    } catch (error) {

      if(error.code === 'EEXIST') {
        logger.error(`buildSimulatePreTestFolders Directory already exists ${newFolder}`);
        reject('getCrashTestAndFolders Directory already exists');
      } else {
        logger.error(error.stack);
        reject('getCrashTestAndFolders promise rejected');
      }
    }
  });
}

function copyAllLatestLogFiles( foundJob) {
  return new Promise( async (resolve, reject) => {
    try {
      const foundCrashes = await getCrashTestAndFolders(foundJob);
      const foundCrash = foundCrashes[0];
      const dataAfterStartedProcess = foundCrashes[1];
      // in foundCrash  all test go in order to start to completion. so last crash is the active test.
      let testMatchDir = dataAfterStartedProcess.get(foundCrash[foundCrash.length -1].testId);
      //build folder paths
      const DestDir = path.join(config.get('logWatcherPath2'), testMatchDir.test); 
      const logDir = config.get('CtLogFilePath');
      //copy all newest files to Dir
      const files = fs.readdirSync( logDir );
      files.forEach(async file =>{
        const filePath = path.join(logDir, file);
        const dest = path.join(DestDir, file);
        const stat = fs.statSync(filePath);
        const ct = stat.ctime;
        const td = new Date(Date.now());
        const isFile = stat.isFile()
        const getFullYear = ct.getFullYear() === td.getFullYear()
        const getMonth = ct.getMonth() === td.getMonth()
        const getDay = ct.getDay() === td.getDay()

        if (isFile && getFullYear && getMonth && getDay ) {
          const p = filePath;
          const c = dest;
          await fsPromises.copyFile(filePath, dest, fsPromises.constants.COPYFILE_EXCL, (err) => {
            if(err) {
              logger.error(`copyfile faild: ${err}`)
              throw err;
            }
            logger.debug(`Successfull copy file`);
          });
        }
      });

      
      if(files.length > 0){
        resolve();
      } else {
        reject('copyAllLatestLogFiles Promise rejected');
      }

    } catch (error) {

      if(error.code === 'EEXIST') {
        logger.error(`copyAllLatestLogFiles Directory already exists ${newFolder}`);
        reject('copyAllLatestLogFiles Directory already exists');
      } else {
        logger.error(error.stack);
        reject('copyAllLatestLogFiles promise rejected');
      }
    }
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

// status[status, workStatus]
function updatingTestGroupStatus(index, status, dbJobId, testGroup) {
  return new Promise( async (resolve, reject) => {
    testGroup[index].status = status[0];
    const completeNewDate = momentz.tz(Date.now(), config.get('timeZone'));
    testGroup[index].finished_date = completeNewDate;
    testGroup[index].workStatus = status[1];
    //change status date
    await dbUtilities.findAndUpdateJob(dbJobId.jobId, { trans_date: completeNewDate,  testGroup: testGroup }); 
    if( testGroup.length > 0){
      resolve();
    }   
    else {
      reject('updatingTestGroupLengthOne Promise reject');
    }   
  });
}

function getNewestCtLogFileFromPath(dir, extension) {
    let newestFile = null;
    let newestTime = 0;
    const files = fs.readdirSync( dir );
    const filterFiles = files.filter( file => file.match(new RegExp(`.*\.(${extension})`, 'ig')));
    filterFiles.forEach(file =>{
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
  
      if (stat.isFile() && stat.mtimeMs > newestTime) {
        newestFile = filePath;
        newestTime = stat.mtimeMs;
      }
    });
    return newestFile;
}

function readLineTime( lineTime, testStartDate){
  return new Promise((resolve, reject) => {
    let newTime = null;
    try {
      //let foundFile = lineTime.split(' ');
      let foundFile = lineTime.trim();

      //logger.debug(`foundFile: $${foundFile}`);
      //logger.debug(`foundFile: $${foundFile[1]}`);
      //let foundFile2 = foundFile[0];
      
      //logger.debug(`foundFile2: $${foundFile2}`);
      let foundFile3 = foundFile.split('\t');
      //logger.debug(`foundFile3: $${foundFile3}`);
      let foundFile4 = foundFile3[4].split(':');  
      //.debug(`foundFile4: $${foundFile4}`);
      const splitSecMil = foundFile4[2].split('.'); 
      //logger.debug(`splitSecMil: $${foundFile3}`);     
      const buildNewDate = new Date(testStartDate.getFullYear(), testStartDate.getMonth(), testStartDate.getDay(), foundFile4[0], foundFile4[1], splitSecMil[0], splitSecMil[1]);
      newTime = momentz.tz(buildNewDate, config.get('timeZone')).format('HH:mm:ss:SS'); 
    } catch (error) {
      logger.debug(`lineTime: ${lineTime}`);
      logger.error(error.stack);
    } 
    if (newTime !== moment.invalid) {
      resolve(newTime)
    } else {
      reject('readLineTime promise rejected');
    } 
  });
}

function readAndSearchInFile(searchObject, dirPathFile, testStartDate) {
  return new Promise(async(resolve, reject) => {
    let foundString = null;
    const fileStartTime = momentz.tz(testStartDate, config.get('timeZone')).format('HH:mm:ss:SS'); 
      logger.debug(`newTime: ${fileStartTime}`);
    const fileStream = fs.createReadStream(dirPathFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    try {
      // Note: we use the crlfDelay option to recognize all instances of CR LF
      // ('\r\n') in input.txt as a single line break.
      const logErrors = ['JT Crashed', 'Exception']
      for await (const line of rl) {
        // Each line in input.txt will be successively available here as `line`.
        logger.debug(`line: ${line}`);
        if (  await readLineTime(line, testStartDate) > fileStartTime) {
          if(line.includes(searchObject)){
            foundString = 'crash';
            break;
          } 
        }
      } //loop end
    } catch (error) {
      logger.error(error.stack);
    }
    finally{
      rl.close();
    }

    if (foundString != null) {
      resolve(foundString);
    } else {
      reject(`readAndSearchInFile promise rejected: ${foundString}`);
    }
  });  
}

function searchCtLogForProblem(testStartDate) {
  return new Promise( async (resolve, reject) => {
    let foundString = 'empty';

    try {
      let newTestStartDate = new Date(testStartDate);
      //newTestStartDate = formatDate(newTestStartDate);
      

      const foundFile = getNewestCtLogFileFromPath(config.get('CtLogFilePath'), '.log');
      logger.debug(`newest foundFile: ${foundFile}`);
      const foundCrashResults = await readAndSearchInFile('JT Crashed', foundFile, newTestStartDate);
      logger.info(`Finished searching CT log and found: ${foundCrashResults}`);
      resolve(foundCrashResults);

    } catch (error) {
      logger.error(error.stack);
      reject('searchCtLogForProblem promise rejected.');
    }
  });
}

//assume dbJobId is has last database data
function buildRetryTestJobList(dbJobId) {
  return new Promise(async (resolve, reject) => {
    let newTestList = '';
    let testGroup = await buildlTestGroupLiteralObject(dbJobId.testGroup);
    for (let index = 0; index < testGroup.length; index++) {
      /// first in list. also the first minute
      if (testGroup[index].workStatus === processStates.NotStarted || testGroup[index].workStatus === processStates.InProgress) { 

        // search for last running test; assume it does exist; for sim we have to build it.
        const isSimulate = dbJobId.testmode.simulate ==='true'?true:false;
        if(isSimulate){
          //folder needs to exist in logs for pre-test for watcher to complete successfully
          //buildSimulatePreTestFolders() builds fake folders if it has to.
          // watcher.areAllTestsFinished() can find folder after first init-date.
          await buildSimulatePreTestFolders(index, testGroup, dbJobId.process.init_date);
          //this folder start date comes from DB TestGroup
          await buildSimulateRetryFolder(testGroup[index].testId, testGroup[index].start_date);

        }
        else {
          // the existing test for folder will exist.
          logger.info(`${testGroup[index].testId} should exist!`);
        }
        // search CT log for JT crashed and Rebooting
        const foundProblem = await searchCtLogForProblem(testGroup[index].start_date);

        if(foundProblem.includes('crash')) {
          logger.debug(`Did find crash for ${testGroup[index].testId}`);
          if (testGroup.length === 1) { // one test in testgroup
            logger.debug(`First test status = ${testGroup[index].testId} = ${testGroup[index].workStatus} and testgroup == 1; newTestList =[] ; update test status = crash`);
            await updatingTestGroupStatus(index, [processStates.Crash, processStates.Finished], dbJobId, testGroup);
            newTestList = [];
          } 
          else { // many test in testgroup; in gap before not started and after last test status
            
            //what if the last test Crashed in the list
            if (index === (testGroup.length - 1)) {
              logger.debug(`Last test status = ${testGroup[index].testId} = ${testGroup[index].workStatus} and testgroup == many  ; newTestList =[] ; update test status = crash`);
              newTestList = []
            } else {
              logger.debug(`Many test status = ${testGroup[index].testId} = ${testGroup[index].workStatus} and testgroup == many  ; newTestList =[shift to many] ; update test status = crash`);
              newTestList = [];
              testGroup.forEach( (test) => {
                if (test.testId !== testGroup[index].testId && test.workStatus === processStates.NotStarted) {
                  newTestList.push(test);//many
                }
              });
              //newTestList = testGroup.shift();//many
            }

            await updatingTestGroupStatus(index, [processStates.Crash, processStates.Finished], dbJobId, testGroup);
          }
          
          break; // work is done and tests found
        } 
       
        logger.debug(`Did not find crash for ${testGroup[index].testId}`);
      } //end of if 
      logger.debug(`Skipping test: ${testGroup[index].testId}`);
    } // end of loop
    if(newTestList === '')
      reject('buildNewNotStartedTestJobList Promose Rejected');
    resolve(newTestList);
  });
}

module.exports.buildSimulateRetryFolder = buildSimulateRetryFolder;
module.exports.buildlTestGroupLiteralObject = buildlTestGroupLiteralObject;
module.exports.updatingTestGroupStatus = updatingTestGroupStatus;
module.exports.getNewestCtLogFileFromPath = getNewestCtLogFileFromPath;
module.exports.readLineTime = readLineTime;
module.exports.readAndSearchInFile = readAndSearchInFile;
module.exports.searchCtLogForProblem = searchCtLogForProblem;
module.exports.buildRetryTestJobList = buildRetryTestJobList;
module.exports.updateCrashTestCaseFolder = updateCrashTestCaseFolder;
module.exports.copyAllLatestLogFiles = copyAllLatestLogFiles;