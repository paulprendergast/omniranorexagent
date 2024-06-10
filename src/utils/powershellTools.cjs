const { PowerShell } = require("node-powershell");
const { logger } = require("./logger.cjs");

const psGetProcess = () => {
    return new Promise((resolve, reject) => {
  
      const ps = new PowerShell({
          executionPolicy: 'Bypass',
          noProfile: true,
          PATH: process.env.PATH
      }); 
  
      
      const command = PowerShell.command`.\\test\\FetchPwsh_process.ps1`;
      ps.invoke(command)
      .then(output => {
        logger.debug(output);
        //const result = JSON.parse(output.raw);
        ps.dispose();
        resolve(output);
      })
      .catch(err => {
        logger.error(err.stack);
        ps.dispose();
        reject(err);
      });
    });  
};

const psSimulate = () => {
    return new Promise((resolve, reject) => {
  
      const ps = new PowerShell({
          executionPolicy: 'Bypass',
          noProfile: true,
          PATH: process.env.PATH
      }); 

      const file = `\\home\\paulp\\projects\\omniranorexagent\\src\\utils\\scripts\\RanorexSimulateStandalone.ps1`;
      const timeout = `-timeout 5`;
      const location = `-testlocation .\\logs\\`;
      const tests = `-testArray TC12345,TC67890`;

 /*      const mfile = `${file}`;
      const mtimeout = `${timeout}`;
      const mlocation = `${location}`;
      const mtests = `${tests}`;  */
      
      const newString = file.concat( " ", timeout, " ", location, " ", tests);
      const command = PowerShell.command`${newString}`.replace("\"","").replace("\"","");
      logger.debug('start psSimulate.');
      //const command = PowerShell.command`.\\ps\\RanorexSimulateStandalone.ps1 -timeout 5 -testlocation .\\logs\\ -testArray TC12345,TC67890`;
      //.\ps\RanorexSimulateStandalone.ps1 -timeout 5 -testlocation .\..\..\logs\ -testArray TC12345,TC67890,TC13579
      ps.invoke(command)
      .then(output => {
        logger.debug(output.command);
        //const result = JSON.parse(output.raw);
        ps.dispose();
        resolve(output);
      })
      .catch(err => {
        logger.error(err.stack);
        ps.dispose();
        reject(err);
      });
    });
};

module.exports.psGetProcess = psGetProcess;
module.exports.psSimulate = psSimulate;