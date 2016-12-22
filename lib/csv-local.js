var _ = require('lodash');
var Baby = require('babyparse');

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

DataTable.prototype.get = function(i, cb) {
	if (i > this.data.length)
		throw new Error(i + " is out of range ");
	if (cb)
		cb(toResult(i, this.data[i - 1]));
};

DataTable.prototype.random = function(cb) {
	this.get(Math.floor(Math.random() * this.data.length) + 1, cb);
};

DataTable.prototype.next = function() {
	var argIndex = 0;
	var options = _.isFunction(arguments[0]) ? { wrap: true } : arguments[argIndex++];
	options.wrap = _.isBoolean(options.wrap) ? options.wrap : true;
	options.rows = options.rows || 1;
	var cb = arguments.length > argIndex ? arguments[argIndex++] : null;

	for (var i = 1; i <= options.rows; i++) {
		if (this.index > this.data.length) {
			if (options.wrap)
				this.index = 1;
			else
				throw new Error("Reached end of CSV file and wrapping is disabled");
		}
		if (cb)
			cb(toResult(this.index, this.data[this.index++]));
	}
};

function initialize() {
	return {
		open: function(name) {
			return new DataTable(name)
		}
	};
}

module.exports = {
	initialize: initialize
};