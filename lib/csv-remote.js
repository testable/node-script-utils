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

DataTable.prototype.get = function(i, success, failure) {
	var path = "/rows/" + i;
	return this._getRows(path, success, failure);
};

DataTable.prototype.random = function(success, failure) {
	return this.get(Math.floor(Math.random() * this.details.numRows) + 1, success, failure);
};

DataTable.prototype.next = function() {
	var index = 0;
	var options = _.isFunction(arguments[0]) ? { wrap: true } : arguments[index++];
	options.wrap = _.isBoolean(options.wrap) ? options.wrap : true;
	options.rows = options.rows || 1;
	var success = arguments.length > index ? arguments[index++] : null;
	var failure = arguments.length > index ? arguments[index] : null;

	var path = "/rows/iterators/executions." + this.executionId + "?wrap=" + options.wrap + "&rows=" + options.rows;
	return this._getRows(path, success, failure);
};

DataTable.prototype._getRows = function(path, success, failure) {
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
				if (_.isFunction(failure))
					failure(error);
			} else if (_.isFunction(success)) {
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
					success(result);
				});
			}
		});
	}).on('error', function(err) {
		_this.log.error('Problem retrieving data table ' + name + ': ' + err.message);
		if (_.isFunction(failure))
			failure(err);
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
			return _.isObject(ds) ? new DataTable(info.chunk.id < 0 ? info.chunk.id : executionId, ds, info, log) : ds;
		}
	};
}

module.exports = {
	initialize: initialize
};