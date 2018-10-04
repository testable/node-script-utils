
const fs = require('fs');
const _ = require('lodash');
const createLog = require('./log.js');
const createResults = require('./results.js');
const csvRemote = require('./csv-remote.js');
const csvLocal = require('./csv-local.js');
const wdio = require('./wdio-commands');
const EventEmitter = require('events');

var LocalInfo = {
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

var writeStream = isLocal ? null : fs.createWriteStream(process.env.TESTABLE_RESULT_FILE, { flags: 'a' });
var log = createLog(writeStream);
var results = createResults(writeStream);
results.current = results('dummy','http://dummy.com');
results.toResourceName = function(url) { return url; };

var stopwatch = function(code, metricName, resource) {
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
var execute = function(codeToExecute) {
    return new Promise(function(resolve, reject) {
        if (codeToExecute)
            codeToExecute(resolve);
        else
            resolve();
    });
}

var csv = isLocal ? csvLocal.initialize() : csvRemote.initialize(info, log);
var registerCommands = typeof browser !== 'undefined' && _.isUndefined(browser.testableLogInfo);

if (registerCommands) {
    const browsers = [ browser ];
    if (process.env.TESTABLE_BROWSERS) {
        browsers.push.apply(browsers, process.env.TESTABLE_BROWSERS.split(","));
    }
    _.forEach(browsers, function(brwsr) {
        wdio.registerLogCommands(brwsr, log);
        wdio.registerCsvCommands(brwsr, csv);
        wdio.registerResultsCommands(brwsr, results);
        wdio.registerInfoCommands(brwsr, info);
        wdio.registerStopwatchCommands(brwsr, stopwatch);
    });
}

module.exports.isLocal = isLocal;
module.exports.info = info;
module.exports.log = log;
module.exports.results = results;
module.exports.stopwatch = stopwatch;
module.exports.execute = execute;
module.exports.events = new EventEmitter();
module.exports.dataTable = csv;