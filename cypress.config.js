const { defineConfig } = require("cypress");
var config = require('config');
const fs = require('fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { logger } = require("./src/utils/logger.cjs");
const { spawn, exec } = require('node:child_process');
const { psStartApp } = require('./src/utils/powershellTools.cjs');
const { trusted } = require("mongoose");
const { tryCatch } = require("bullmq");


const PORT = config.get("AppPort") || 4051;

module.exports = defineConfig({
  e2e: {
    baseUrl: `http://localhost:${PORT}`,
    chromeWebSecurity: false,
    
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        deleteAllDirectories() {
          
          try{
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
          } catch(error) {
            return `deleteAllDirectories has error: ${error}`;
          }
        },
        returnLogFolderItems(){
          return new Promise((resolve, reject) => {
            try {
              let found =[];
              const logsFold = path.join(__dirname, './logs/');
              const dirents  = fs.readdirSync(logsFold, { withFileTypes: true });

              dirents.forEach((item) => {
                if(item.isDirectory())
                {
                  found.push(item);
                }
              });
              resolve(found);
            } catch(error) {
              return `returnLogFolderItems has error: ${error}`
            }
          });
        },
        countFiles(folderName){
          return new Promise((resolve, reject) => {
            try{
              const logsFold = path.join(__dirname, './logs');
              const folder = path.join(logsFold, folderName);
              const files = fs.readdirSync(folder, { withFileTypes: true });
              resolve(files);
            } catch(error) {
              return `countFiles has error: ${error}`
            }
          });
        },
      })
    },
  },
});
