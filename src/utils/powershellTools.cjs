const { PowerShell } = require("node-powershell");
const { logger } = require("./logger.cjs");

const psGetProcess = () => {
    return new Promise((resolve, reject) => {
  
      const ps = new PowerShell({
          executionPolicy: 'Bypass',
          noProfile: true,
          PATH: process.env.PATH
      }); 
  
      
      const command = PowerShell.command`.\\src\\utils\\scripts\\getprocess.ps1`;
      ps.invoke(command)
      .then(output => {
        logger.debug(output.raw);
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

const psSimulate = (file, timeout, location, tests) => {
    return new Promise((resolve, reject) => {
      try {
        const ps = new PowerShell({
          executionPolicy: 'Bypass',
          noProfile: true,
          PATH: process.env.PATH
        }); 

        /* const file = `.\\src\\utils\\scripts\\simulate.ps1`;
        const timeout = `-timeout 5`;
        const location = `-testlocation .\\logs\\`;
        const tests = `-testArray TC12345,TC67890`; */
        
        //const newString = file.concat( ` `, timeout, ` `, location, ` `, tests);
        const newString2 = `${file} ${timeout} ${location} ${tests}`;
        //const newString3 = `${file} -timeout ${timeout} -testlocation ${location} -testArray ${tests}`;
        //const command = PowerShell.command`${newString}`//.replace("\"","").replace("\"","");
        //const command = PowerShell.command`.\\test\\RanorexSimulateStandalone.ps1 -timeout 5 -testlocation .\\logs\\ -testArray TC12345,TC67890`;
        //const command = PowerShell.command`cd .\\test; pwd`;
        //const command = PowerShell.command` .\\src\\utils\\scripts\\simulate.ps1 -timeout 5 -testlocation .\\logs\\ -testArray TC12345,TC67890`;
        //const command = PowerShell.command`.\\test\\test.ps1`;
        const command = PowerShell.command`${newString2}`.replace("\"","").replace("\"","");
          ps.invoke(command)
          .then(output => {
            logger.debug(output.raw);
            //const result = JSON.parse(output.raw);
            ps.dispose();
            resolve(output);
          })
          .catch(err => {
            logger.error(err.stack);
            ps.dispose();
            reject(err);
          });
      } catch (err) {
        logger.error(err.stack);
      }
    });
};



module.exports.psGetProcess = psGetProcess;
module.exports.psSimulate = psSimulate;