const _ = require('lodash');
const Baby = require('babyparse');
const util = require('util');

function toResult(index, data) {
	return {
		index: index,
		data: data,
		indexed: _.values(data) 
	};
}

const DataTable = function(file) {
	this.results = Baby.parseFiles(file, { header: true, skipEmptyLines: true });
	if (this.results.errors && this.results.errors.length > 0) {
		const msg = "Errors occurred parsing " + file + ": " + util.inspect(this.results.errors);
		if (this.results.data.length > 0)
			console.log(msg);
		else
			throw new Error(msg);
	}
	this.headers = this.results.meta.fields;
	this.data = this.results.data || [];
	this.index = 0;
};

DataTable.prototype.get = function(i) {
	return new Promise((resolve, reject) => { 
		if (i > this.data.length)
			reject(i + " is out of range ");
		else
			resolve(toResult(i, this.data[i - 1]));
	});
};

DataTable.prototype.random = function() {
	return this.get(Math.floor(Math.random() * this.data.length) + 1);
};

DataTable.prototype.next = function(options) {
	options = options || {};
	return new Promise((resolve) => { 
		options.rows = options.rows || 1;

		const results = [];
		let success = true;
		for (let i = 1; i <= options.rows; i++) {
			if (this.index > this.data.length) {
				this.index = 1;
			}
			results.push(toResult(this.index, this.data[this.index++]));
		}
		if (success)
			resolve(results);
	});
};

function initialize() {
	const tables = {};
	return {
		open: function(name) {
			let table = tables[name];
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