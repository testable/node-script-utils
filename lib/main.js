
const fs = require('fs');
const _ = require('lodash');
const createLog = require('./log.js');
const createResults = require('./results.js');
const csvRemote = require('./csv-remote.js');
const csvLocal = require('./csv-local.js');
const wdio = require('./wdio-commands');
const eventsWatcher = require('./events-watcher');
const EventEmitter = require('events');

const LocalInfo = {
    expectedFinishTimestamp: -1,
	iteration: 0,
  	client: 0,
  	chunk: { 
  		id: -1,
     	executionType: 'Main',
     	agent: 'local',
     	createdAt: Date.now(),
     	updatedAt: Date.now(),
     	startedAt: Date.now(),
     	concurrentClients: 1 
   	},
  	agent: 'local',
  	execution: { 
  		id: -1,
     	createdAt: Date.now(),
     	updatedAt: Date.now(),
     	startedAt: Date.now(),
     	concurrentClients: 1
   	},
  	region: { 
  		id: 1,
    	createdAt: Date.now(),
    	updatedAt: Date.now(),
    	name: 'local',
    	public: true,
    	latitude: 39.0436,
    	longitude: -77.4878,
    	description: 'Local',
     	active: true 
   	},
   	outputDir: process.cwd()
};

const isSmokeTest = Number(process.env.TESTABLE_CHUNK_ID) < 0;
var isLocal;
var info;
if (process.env.TESTABLE_INFO) {
    try {
        var data = fs.readFileSync(process.env.TESTABLE_INFO, 'utf8');
        info = JSON.parse(data);
        isLocal = false;
    } catch(err) {
        info = LocalInfo;
        isLocal = true;
        console.error('Error loading Testable info, treading run as local ', err);
    }
} else {
    info = LocalInfo;
	isLocal = true;
}

const doNotWait = isSmokeTest || isLocal;
const writeStream = isLocal ? null : fs.createWriteStream(process.env.TESTABLE_RESULT_FILE, { flags: 'a' });
const log = createLog(writeStream);
const results = createResults(writeStream, doNotWait);
results.current = results('dummy','http://dummy.com');
results.toResourceName = function(url) { return url; };

const stopwatch = function(code, metricName, resource) {
    const start = Date.now();
    const options = _.isObject(metricName) ? metricName : { name: metricName, resource: resource };
    options.units = 'ms';
    const _this = this;
    return new Promise(function(resolve, reject) {
        var done = function() {
            var result = results(options.resource);
            if (result !== null) {
                options.val = Date.now() - start;
                result.timing(options);
            }
            resolve(result);
        };
        code(done);
    });
};

// stub functionality. no tracking needed outside of sandbox
const execute = function(codeToExecute) {
    return new Promise(function(resolve, reject) {
        if (codeToExecute)
            codeToExecute(resolve);
        else
            resolve();
    });
};

const expectedFinishTimestamp = info.expectedFinishTimestamp;
const waitForFinish = function() {
    return new Promise(function(resolve, reject) {
        if (expectedFinishTimestamp > 0 && expectedFinishTimestamp - Date.now() > 0)
            setTimeout(resolve, expectedFinishTimestamp - Date.now());
        else
            resolve();
    });
};

const csv = isLocal ? csvLocal.initialize() : csvRemote.initialize(info, log);
const registerCommands = typeof browser !== 'undefined' && _.isFunction(browser.waitForExist) && _.isUndefined(browser.testableLogInfo);

const events = new EventEmitter();
if (process.env.TESTABLE_EVENTS_FILE) {
    eventsWatcher(process.env.TESTABLE_EVENTS_FILE, events, log);
}

if (registerCommands) {
    wdio.registerLogCommands(browser, log);
    wdio.registerCsvCommands(browser, csv);
    wdio.registerResultsCommands(browser, results, doNotWait);
    wdio.registerInfoCommands(browser, info);
    wdio.registerStopwatchCommands(browser, stopwatch);
    wdio.registerEventsCommands(browser, events, doNotWait, waitForFinish);
}

module.exports.isLocal = isLocal;
module.exports.isSmokeTest = isSmokeTest;
module.exports.info = info;
module.exports.log = log;
module.exports.results = results;
module.exports.stopwatch = stopwatch;
module.exports.execute = execute;
module.exports.events = events;
module.exports.dataTable = csv;
module.exports.waitForFinish = waitForFinish;