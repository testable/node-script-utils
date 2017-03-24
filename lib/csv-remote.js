var _ = require('lodash');
var Baby = require('babyparse');
var request = require('request');
var util = require('util');
var fs = require('fs');

var AgentKey = process.env.TESTABLE_KEY;
var BaseUrl = process.env.TESTABLE_BASE_URL;

var DataTable = function(executionId, name, info, log) {
	this.executionId = executionId;
	this.name = name;
	this.info = info;
	this.log = log;

	this.results = Baby.parseFiles(name, { header: true, skipEmptyLines: true });
	if (this.results.errors && this.results.errors.length > 0) {
		var msg = "Errors occurred parsing " + name + ": " + util.inspect(this.results.errors);
		if (this.results.data.length > 0)
			console.log(msg);
		else
			throw new Error(msg);
	}
	this.headers = this.results.meta.fields;
	this.data = this.results.data || [];
};

DataTable.prototype.get = function(i) {
	var self = this;
	return new Promise(function(resolve, reject) { 
		if (i > self.data.length)
			reject(i + " is out of range ");
		else
			resolve({
				index: i,
				data: self.data[i - 1],
				indexed: _.values(self.data[i - 1])
			});
	});
};

DataTable.prototype.random = function() {
	return this.get(Math.floor(Math.random() * this.data.length) + 1);
};

DataTable.prototype.next = function(options) {
	options = options || {};
	options.wrap = _.isBoolean(options.wrap) ? options.wrap : true;
	options.rows = options.rows || 1;

	var nameForIterator = this.name.split(".").join("").split("/").join("");
	var path = "/rows/iterators/executions." + this.executionId + "." + nameForIterator + "/by-index?wrap=" + options.wrap + 
		"&rows=" + options.rows + "&length=" + this.data.length;
	return this._getRows(path);
};

DataTable.prototype._getRows = function(path) {
	var self = this;
	return new Promise(function(resolve, reject) { 
		var url = BaseUrl + path;
		url += (path.indexOf('?') !== -1 ? '&' : '?') + "key=" + AgentKey;
		request({ url: url }, function (error, response, body) {
			var msg;
			if (error) {
				self.log.error('Problem retrieving data table ' + name + ': ' + error.message);
				reject(error);
			} else if (response.statusCode !== 200) {
				msg = 'Problem retrieving rows at ' + path + '. Status code ' + response.statusCode;
				self.log.error(msg);
				reject(msg);
			} else if (body) {
				var indices = JSON.parse(body);
				resolve(_.map(indices, function(index) {
					var data = self.data[index - 1];
					return {
						index: index,
						data: data,
						indexed: _.values(data)
					};
				}));
			} else {
				msg = 'No body received';
				self.log.error(msg);
				reject(msg);
			}
		});
	});	
};

function initialize(info, log) {
	var tables = {};
	var executionId = info.execution.id;

	return {
		open: function(name) {
			var table = tables[name];
			if (_.isUndefined(table)) {
				var isCsv = name.indexOf('.csv') === name.length - 4;
				if (!isCsv)
					throw new Error('Expected a .csv file');
				if (!fs.existsSync(name))
					throw new Error('Could not find ' + name + '. Please upload.');
				table = new DataTable(info.chunk.id < 0 ? info.chunk.id : executionId, name, info, log)
				tables[name] = table;
			}
			return table;
		}
	};
}

module.exports = {
	initialize: initialize
};