const _ = require('lodash');
const pathModule = require('path');

function isWdioContext(browser) {
	return _.isObject(browser) && _.isFunction(browser.addCommand);
}

function registerLogCommands(browser, log) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableLogTrace', function() {
			return log.trace.apply(log, arguments);
		});
		browser.addCommand('testableLogDebug', function() {
			return log.debug.apply(log, arguments);
		});
		browser.addCommand('testableLogInfo', function() {
			return log.info.apply(log, arguments);
		});
		browser.addCommand('testableLogError', function() {
			return log.error.apply(log, arguments);
		});
		browser.addCommand('testableLogFatal', function() {
			return log.fatal.apply(log, arguments);
		});
	}
}

function registerCsvCommands(browser, csv) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableCsvGet', function(name, index) {
			return csv.open(name).get(index);
		});
		browser.addCommand('testableCsvRandom', function(name) {
			return csv.open(name).random();
		});
		browser.addCommand('testableCsvNext', function(name, options) {
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
		browser.addCommand('testableTiming', function(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.timing.apply(result, args);
		});
		browser.addCommand('testableCounter', function(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.counter.apply(result, args);
		});
		browser.addCommand('testableHistogram', function(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.histogram.apply(result, args);
		});
		browser.addCommand('testableMetered', function(result) {
			const args = Array.prototype.slice.call(arguments, 1);
			return result.metered.apply(result, args);
		});
		browser.addCommand('testableGetMetric', function() {
			return results.get.apply(results, arguments);
		});
		browser.addCommand('testableWaitForValue', function(options) {
			return results.waitForValue(options).catch(function(err) {
                throw new Error(err);
            });
		});
		browser.addCommand('testableWaitForCondition', function(options) {
			return results.waitForCondition(options).catch(function(err) {
                throw new Error(err);
            });
		});
		browser.addCommand('testableIncrementAndWaitForValue', function(options) {
			return results.incrementAndWaitForValue(options).catch(function(err) {
                throw new Error(err);
            });
		});
		browser.addCommand('testableBarrier', function(name, value) {
			return results.barrier(name, value).catch(function(err) {
                throw new Error(err);
            });
		});
	}
}

function registerInfoCommands(browser, info, isLocal) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableInfo', function () {
			return info;
		});
		browser.addCommand('testableScreenshot', function(name) {
			const path = pathModule.join(process.env.OUTPUT_DIR || '.', name + '.png');
			browser.saveScreenshot(path);
			return path;
		});
	}
}

function registerStopwatchCommands(browser, stopwatch) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableStopwatch', function(code, metricName, resource) {
			return stopwatch(code, metricName, resource);
		});
	}
}

function registerEventsCommands(browser, events, doNotWait, waitForFinish) {
	if (isWdioContext(browser)) {
		browser.addCommand('testableWaitForEvent', function(eventName, timeout, defaultVal) {
			if (doNotWait)
				return Promise.resolve(defaultVal);
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
		browser.addCommand('testableWaitForFinish', function() {
			return waitForFinish();
		});
	}
}

module.exports.registerLogCommands = registerLogCommands;
module.exports.registerCsvCommands = registerCsvCommands;
module.exports.registerResultsCommands = registerResultsCommands;
module.exports.registerInfoCommands = registerInfoCommands;
module.exports.registerStopwatchCommands = registerStopwatchCommands;
module.exports.registerEventsCommands = registerEventsCommands;