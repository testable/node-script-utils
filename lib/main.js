
const fs = require('fs');
const createLog = require('./log.js');
const createResults = require('./results.js');
const csvRemote = require('./csv-remote.js');
const csvLocal = require('./csv-local.js');

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


var timing = function(code, metricName, resource) {
    const start = Date.now();
    const _this = this;
    var done = function() {
        var result = results(resource);
        if (result !== null)
            result.timing(metricName, Date.now() - start, 'ms');
    };
    code(done);
};

// stub functionality. no tracking needed outside of sandbox
var testable = {
    start: function() { },
    finish: function() { },
    execute: function(codeToExecute) {
        if (codeToExecute)
            codeToExecute();
    }
};

var csv = isLocal ? csvLocal.initialize() : csvRemote.initialize(info, log);

module.exports.isLocal = isLocal;
module.exports.info = info;
module.exports.log = createLog(writeStream);
module.exports.results = createResults(writeStream);
module.exports.timing = timing;
module.exports.testable = testable;
module.exports.dataTable = csv;