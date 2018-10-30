const _ = require('lodash');

function isWdioContext(browser) {
	return _.isObject(browser) && _.isFunction(browser.addCommand);
}

function registerLogCommands(browser, log) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableLogTrace', function async() {
			return log.trace.apply(log, arguments);
		});
		browser.addCommand('testableLogDebug', function async() {
			return log.debug.apply(log, arguments);
		});
		browser.addCommand('testableLogInfo', function async() {
			return log.info.apply(log, arguments);
		});
		browser.addCommand('testableLogError', function async() {
			return log.error.apply(log, arguments);
		});
		browser.addCommand('testableLogFatal', function async() {
			return log.fatal.apply(log, arguments);
		});
	}
}

function registerCsvCommands(browser, csv) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableCsvGet', function async(name, index) {
			return csv.open(name).get(index);
		});
		browser.addCommand('testableCsvRandom', function async(name) {
			return csv.open(name).random();
		});
		browser.addCommand('testableCsvNext', function async(name, options) {
			return csv.open(name).next(options);
		});
	}
}

function doGetResult(results, options, start) {
	return results.get(options).then(function(value) {
		if (_.isNumber(value) && options.condition(value))
			return Promise.resolve(value);
		else if (shouldContinuePolling(options, start)) {
			return delay(PollIntervalMs).then(function() {
				return doGetResult(results, options, start);
			});
		} else {
			return Promise.reject(`Value ${value} for ${options.name} never matched condition specified`);
		}
	}, function(err) {
		if (shouldContinuePolling(options, start)) {
			return delay(PollIntervalMs).then(function() {
				return doGetResult(results, options, start);
			});
		} else {
			return Promise.reject('Failed to get metric value that matches condition. Error: ' + err);
		}
	});
}

function shouldContinuePolling(options, start) {
	return !_.isNumber(options.timeout) || options.timeout === 0 || (Date.now() + PollIntervalMs - start < options.timeout);
}

function waitForCondition(options, results, doNotWait) {
	if (doNotWait)
		return Promise.resolve();
	else if (!_.isFunction(options.condition))
		return Promise.reject('Must specify a condition function');
	else {
		const start = Date.now();
		return doGetResult(results, options, start).catch(function(err) {
			throw new Error(err);
		});
	}
}

function registerResultsCommands(browser, results, doNotWait) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableResult', function(resource, url) {
			return results(resource, url);
		});
		browser.addCommand('testableTiming', function async(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.timing.apply(result, args);
		});
		browser.addCommand('testableCounter', function async(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.counter.apply(result, args);
		});
		browser.addCommand('testableHistogram', function async(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.histogram.apply(result, args);
		});
		browser.addCommand('testableGetMetric', function async() {
			return results.get.apply(results, arguments);
		});
		browser.addCommand('testableWaitForValue', function async(options) {
			return results.waitForValue(options).catch(function(err) {
                throw new Error(err);
            });
		});
		browser.addCommand('testableWaitForCondition', function async(options) {
			return results.waitForCondition(options).catch(function(err) {
                throw new Error(err);
            });
		});
	}
}

function registerInfoCommands(browser, info) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableInfo', function () {
			return info;
		});
		browser.addCommand('testableScreenshot', function(name) {
			const id = info.region.name + '-' + info.regionalClientIndex + '-' + info.iteration;
			const dir = (process.env.OUTPUT_DIR || '.') + '/';
			browser.saveScreenshot(dir + id + '-' + name + '.png');
		});
	}
}

function registerStopwatchCommands(browser, stopwatch) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableStopwatch', function async(code, metricName, resource) {
			return stopwatch(code, metricName, resource);
		});
	}
}

function registerEventsCommands(browser, events, doNotWait) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableWaitForEvent', function async(eventName, timeout, defaultVal) {
			if (doNotWait)
				return Promise.resolved(defaultVal);
			else {
				var resolved = false;
				return new Promise(function(resolve, reject) {
					var timeoutHandle;
					const listener = function(contents) {
						resolved = true;
						if (timeoutHandle)
							clearTimeout(timeoutHandle);
						resolve(contents);
					};
					if (timeout && timeout > 0) {
						timeoutHandle = setTimeout(function() {
							if (!resolved) {
								events.off(eventName, listener);
								reject(`Timeout waiting for event ${eventName}`);
							}
						}, timeout);
					}
					events.once(eventName, listener);
				});
			}
		});
	}
}

module.exports.registerLogCommands = registerLogCommands;
module.exports.registerCsvCommands = registerCsvCommands;
module.exports.registerResultsCommands = registerResultsCommands;
module.exports.registerInfoCommands = registerInfoCommands;
module.exports.registerStopwatchCommands = registerStopwatchCommands;
module.exports.registerEventsCommands = registerEventsCommands;