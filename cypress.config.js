const { defineConfig } = require("cypress");
var config = require('config');

const PORT = config.get("AppPort") || 4051;

module.exports = defineConfig({
  e2e: {
    baseUrl: `http://localhost:${PORT}`,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      
    },
  },
});
