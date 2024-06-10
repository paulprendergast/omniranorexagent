const { MongoBatchReExecutionError } = require('mongodb');
const mongoose = require('mongoose');

const requireObjectIdValidator = [
    function (val) {
        return(mongoose.isObjectIdOrHexString(val)); 
    },
    '{PATH} is not ObjectId or HexString'
];
const requireStringValidator = [
    function (val) {
        let testVal = val.trim();
        return(testVal.length > 0);
    },
    '{PATH} needs to have a value'
];

const requireDateValidator = [
    function (val) {
        
        return(val instanceof Date);
    },
    '{PATH} is not in correct format date'
];

const testResultSchema = new mongoose.Schema({
    testId: {
        type: String,
        require: true,
        validate: requireStringValidator
    },
    start_date: {
        type: Date,
        require: true,
        validate: requireDateValidator
    },
    finished_date: {
        type: Date,
        require: true,
        validate: requireDateValidator
    },
    workStatus: {
        type: String,
        require: true,
        validate: requireStringValidator
    },
    status: {
        type: String,
        require: true,
        validate: requireStringValidator
    }
});

const requireTestResultValidator = [
    function (val) {
        
        return(val instanceof testResult);
    },
    '{PATH} is not in correct format'
];



const jobSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.ObjectId,
        require: true,
        validate: requireObjectIdValidator
    },
    parentJobId: {
        type: mongoose.ObjectId,
        require: true,
        validate: requireObjectIdValidator
    },
    jobType: {
        type: String,
        require: true,
        validate: requireStringValidator
    },
    machineName: {
        type: String,
        require: true,
        validate: requireStringValidator
    },
    agentIp: {
        type: String,
        require: true,
        validate: requireStringValidator
    },
    init_date: {
        type: Date,
        require: true,
        validate: requireDateValidator
    },
    trans_date: {
        type: Date,
        require: true,
        validate: requireDateValidator
    },
    status: {
        type: String,
        require: true,
        validate: requireStringValidator
    },
    agentData: new mongoose.Schema({
        testSuiteType: {
            type: String,
            require: true,
            validate: requireStringValidator
        },
        simulatorConfig: {
            type: String,
            require: true,
            validate: requireStringValidator
        },
        simulatorPath: {
            type: String,
            require: true,
            validate: requireStringValidator
        },
        omnicenterIp: {
            type: String,
            require: true,
            validate: requireStringValidator
        },
        ctip: {
            type: String,
            require: true,
            validate: requireStringValidator
        }
    }),
    testmode: new mongoose.Schema({
        enabled: {
            type: String,
            require: true,
            validate: requireStringValidator
        },
        simulate: {
            type: String,
            require: true,
            validate: requireStringValidator
        }
    }),
    testGroup: [{
        type: testResultSchema,
        default: testResultSchema,
        validate: requireTestResultValidator
    }]
});


module.exports = { jobSchema, testResultSchema };