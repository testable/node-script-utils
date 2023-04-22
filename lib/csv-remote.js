const _ = require('lodash');
const Baby = require('babyparse');
const util = require('util');
const fs = require('fs');

const DataTable = function(executionId, name, info, log) {
	this.executionId = executionId;
	this.name = name;
	this.info = info;
	this.log = log;

	this.results = Baby.parseFiles(name, { header: true, skipEmptyLines: true });
	if (this.results.errors && this.results.errors.length > 0) {
		const msg = "Errors occurred parsing " + name + ": " + util.inspect(this.results.errors);
		if (this.results.data.length > 0)
			console.log(msg);
		else
			throw new Error(msg);
	}
	this.headers = this.results.meta.fields;
	this.data = this.results.data || [];

	this.globalClientIndex = this.info.globalClientIndex || 0;
	this.iteration = this.info.iteration || 0;
	this.concurrentClients = this.info.execution.concurrentClients || 1;
	this.index = this.concurrentClients * this.iteration + this.globalClientIndex;
};

DataTable.prototype.get = function(i) {
	return Promise.resolve(this._dataAt(i));
};

DataTable.prototype.random = function() {
	return this.get(Math.floor(Math.random() * this.data.length) + 1);
};

DataTable.prototype.next = function(options) {
	options = options || {};
	options.rows = options.rows || 1;

	const answer = [];
	for (let i = 0; i < options.rows; i++)
		answer.push(this._dataAt(this.index++));
	return Promise.resolve(answer);
};

DataTable.prototype._dataAt = function(i) {
	const index = i % this.data.length;
	return {
	  index: index + 1,
	  data: this.data[index],
	  indexed: _.values(this.data[index])
	};
}

function initialize(info, log) {
	const tables = {};
	const executionId = info.execution.id;

	return {
		open: function(name) {
			let table = tables[name];
			if (_.isUndefined(table)) {
				const isCsv = name.indexOf('.csv') === name.length - 4;
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