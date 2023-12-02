const {transports, format, addColors, createLogger} = require('winston');
const config = require('config');
// Define your severity levels.
// With them, You can create log files,
// see or hide levels based on the running ENV.
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// This method set the current severity based on
// the current NODE_ENV: show all the log levels
// if the server was run in development mode; otherwise,
// if it was run in production, show only warn and error messages.
const level = () => {
  const env = process.env.NODE_ENV || 'development'
  const isDevelopment = env === 'development'
  return isDevelopment ? 'debug' : config.get("LogLevel");
}

// Define different colors for each level.
// Colors make the log message more visible,
// adding the ability to focus or ignore messages.
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Tell winston that you want to link the colors
// defined above to the severity levels.
addColors(colors)




// Chose the aspect of your log customizing the log format.
const newFormat = format.combine(
  // Add the message timestamp with the preferred format
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // Tell Winston that the logs must be colored
  //colorize({ all: true }),
  // Define the format of the message showing the timestamp, the level and the message
  format. printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
)



var options = {
    console: {
        handleExceptions: true,
        format: format.combine(format.colorize(), newFormat)
    },
    fileAll: {
        filename: 'logs/all.log',
        format: format.combine(newFormat)
    },
    fileError: {
        filename: 'logs/error.log',
        level: 'error',
        format: format.combine(newFormat)
    },
}


// Create the logger instance that has to be exported
// and used to log messages.
const logger = createLogger({
    level: level(),
    levels,
    transports: [
        new transports.Console(options.console),
        new transports.File(options.fileAll),
        new transports.File(options.fileError),
    ],
  });

module.exports = logger