var _ = require('lodash');
var Baby = require('babyparse');
var util = require('util');

function toResult(index, data) {
	return {
		index: index,
		data: data,
		indexed: _.values(data) 
	};
}

var DataTable = function(file) {
	this.results = Baby.parseFiles(file, { header: true });
	if (this.results.errors && this.results.errors.length > 0) {
		var msg = "Errors occurred parsing " + file + ": " + util.inspect(this.results.errors);
		if (this.results.data.length > 0)
			console.log(msg);
		else
			throw new Error(msg);
	}
	this.data = this.results.data || [];
	this.index = 0;
};

DataTable.prototype.get = function(i) {
	var self = this;
	return new Promise(function(resolve, reject) { 
		if (i > self.data.length)
			reject(i + " is out of range ");
		else
			resolve(toResult(i, self.data[i - 1]));
	});
};

DataTable.prototype.random = function() {
	return this.get(Math.floor(Math.random() * this.data.length) + 1);
};

DataTable.prototype.next = function(options) {
	var self = this;
	options = options || {};
	return new Promise(function(resolve, reject) { 
		options.wrap = _.isBoolean(options.wrap) ? options.wrap : true;
		options.rows = options.rows || 1;

		var results = [];
		var success = true;
		for (var i = 1; i <= options.rows; i++) {
			if (self.index > self.data.length) {
				if (options.wrap)
					self.index = 1;
				else {
					success = false;
					reject("Reached end of CSV file and wrapping is disabled");
				}
			}
			results.push(toResult(self.index, self.data[self.index++]));
		}
		if (success)
			resolve(results);
	});
};

function initialize() {
	var tables = {};
	return {
		open: function(name) {
			var table = tables[name];
			if (_.isUndefined(table)) {
				table = new DataTable(name);
				tables[name] = table;
			}
			return table;
		}
	};
}

module.exports = {
	initialize: initialize
};