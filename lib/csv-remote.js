var _ = require('lodash');
var Baby = require('babyparse');
var request = require('request');

var AgentKey = process.env.TESTABLE_KEY;
var BaseUrl = process.env.TESTABLE_BASE_URL;

var DataTable = function(executionId, dataStore, info, log) {
	this.executionId = executionId;
	this.details = dataStore;
	this.headers = dataStore.headers && dataStore.headers.length > 0 ? Baby.parse(dataStore.headers).data[0] : [];
	this.info = info;
	this.log = log;
};

DataTable.prototype.get = function(i) {
	return this._getRows("/rows/" + i);
};

DataTable.prototype.random = function() {
	return this.get(Math.floor(Math.random() * this.details.numRows) + 1);
};

DataTable.prototype.next = function(options) {
	options = options || {};
	options.wrap = _.isBoolean(options.wrap) ? options.wrap : true;
	options.rows = options.rows || 1;

	var path = "/rows/iterators/executions." + this.executionId + "?wrap=" + options.wrap + "&rows=" + options.rows;
	return this._getRows(path);
};

DataTable.prototype._getRows = function(path) {
	return new Promise(function(resolve, reject) { 
		var url = BaseUrl + "/data-stores/" + this.details.id + path;
		url += (path.indexOf('?') !== -1 ? '&' : '?') + "key=" + AgentKey;
		var _this = this;
		request({ url: url }).on('response', function(res) {
			res.setEncoding('utf8');
			var body = "";
			res.on('data', function (chunk) {
				body += chunk;
			});
			res.on('end', function() {
				if (res.statusCode !== 200) {
					var error = 'Problem retrieving rows at ' + path + '. Status code ' + res.statusCode;
					_this.log.error(error);
					reject(error);
				} else {
					var rows = JSON.parse(body);
					_.forEach(rows, function(row) {
					  	var data = Baby.parse(row.rowData).data[0];
						var byHeader = {};
						for (var i = 0; i < Math.min(data.length, _this.headers.length); i++)
							byHeader[_this.headers[i]] = data[i];
						var result = {
							index: row.rowIndex,
							data: byHeader,
							indexed: data
						};
						resolve(result);
					});
				}
			});
		}).on('error', function(err) {
			_this.log.error('Problem retrieving data table ' + name + ': ' + err.message);
			reject(err);
		});
	});	
};

function initialize(info, log) {
	var executionId = info.execution.id;
	var dataStores = info.dataStores;

	return {
		open: function(name) {
			var isCsv = name.indexOf('.csv') === name.length - 4;
			if (!isCsv)
				throw 'Expected a .csv file';
			var ds = _.find(dataStores, function(dataStore) {
				return dataStore.name === name;
			});
			if (_.isObject(ds))
				return  new DataTable(info.chunk.id < 0 ? info.chunk.id : executionId, ds, info, log)
			else
				throw 'Could not find ' + name + '. Please upload.';
		}
	};
}

module.exports = {
	initialize: initialize
};