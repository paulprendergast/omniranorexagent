const { defineConfig } = require("cypress");
var config = require('config');
const fs = require('fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { logger } = require("./src/utils/logger.cjs");
const { spawn, exec } = require('node:child_process');
const { psStartApp } = require('./src/utils/powershellTools.cjs');
const { trusted } = require("mongoose");

const PORT = config.get("AppPort") || 4051;

module.exports = defineConfig({
  e2e: {
    baseUrl: `http://localhost:${PORT}`,
    chromeWebSecurity: false,
    
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        deleteAllDirectories() {
          return new Promise( (resolve, reject) => {
            const logsFold = path.join(__dirname, './logs/');
            const folders = fs.readdirSync(logsFold);
            for(const f of folders){
              const absolutePath = path.join(logsFold, f);
              fs.lstat(absolutePath, (err, stats) => {
                  if(err)
                      return console.log(err);
          
                  if(stats.isDirectory())
                      fs.rmSync(absolutePath, {recursive: true, force: true});
              }); 
            }
            for(const f of folders){
              const absolutePath = path.join(logsFold, f);
              fs.lstat(absolutePath, (err, stats) => {
                  if(err)
                      return console.log(err);
          
                  if(stats.isFile())
                      reject('deleteAllDirectories Promise Rejected');
              }); 
            }
            resolve(true);
          });
        }, 
      })
    },
  },
});
