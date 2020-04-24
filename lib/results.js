const request = require('request');
const fs = require('fs');
const _ = require('lodash');

const AgentKey = process.env.TESTABLE_KEY;
const BaseUrl = process.env.TESTABLE_BASE_URL;
const PollIntervalMs = 1000;
const UserNs = 'User';

function delay(t, v) {
   return new Promise(function(resolve) { 
       setTimeout(resolve.bind(null, v), t)
   });
}

Promise.prototype.delay = function(t) {
    return this.then(function(v) {
        return delay(t, v);
    });
}

function toMetricOptions(args, hasKey) {
    if (args.length === 0) {
        return null;
    }
    var options;
    if (args[0] !== null && typeof args[0] === 'object') {
        options = args[0];
    } else if (hasKey && args.length < 2) {
        return null;
    } else {
        options = { name: args[0] };
        if (hasKey)
            options.key = args[1];
        const valIndex = hasKey ? 2 : 1;
        if (args.length > valIndex)
            options.val = args[valIndex];
        if (args.length > valIndex + 1)
            options.units = args[valIndex + 1];
    }
    return options;
}

function toMetricGetOptions(args) {
    if (args.length === 0) {
        return null;
    }
    var options;
    if (args[0] !== null && typeof args[0] === 'object') {
        options = args[0];
    } else {
        options = { name: args[0] };
        if (args[1])
            options.key = args[1];
    }
    return options;
}

function toMetricGetPath(options, execId) {
    var path = `/executions/${execId}/metric?name=${options.name}`;
    if (options.namespace)
        path += `&ns=${options.namespace}`;
    return path;
}

function createResults(noRemote, info) {
    const answer = function(resource, url) {
        return {
            data: {
                resource: resource,
                url: url
            },
            timing: function() {
                const options = toMetricOptions(arguments);
                if (options)
                    return sendResult({ 
                        type: 'Timing', 
                        data: { resource: resource, url: url, namespace: options.namespace, name: options.name, 
                            val: options.val, units: options.units } 
                    });
            },
            counter: function() {
                const options = toMetricOptions(arguments);
                if (options)
                    return sendResult({ 
                        type: 'Counter', 
                        data: { resource: resource, url: url, namespace: options.namespace, name: options.name, 
                            val: options.val, units: options.units } 
                    });
            },
            histogram: function() {
                const options = toMetricOptions(arguments, true);
                if (options)
                    return sendResult({ 
                        type: 'Histogram', 
                        data: { resource: resource, url: url,namespace: options.namespace, name: options.name, 
                            key: options.key, val: options.val } 
                    });
            },
            metered: function() {
                const options = toMetricOptions(arguments, true);
                if (options)
                    return sendResult({ 
                        type: 'Metered', 
                        data: { resource: resource, url: url,namespace: options.namespace, name: options.name, 
                            key: options.key, val: options.val, units: options.units } 
                    });
            }
        };
    };

    answer.get = function() {
        const execId = Number(process.env.TESTABLE_EXECUTION_ID);
        if (noRemote || !execId) {
            return Promise.resolve(NaN);
        } else {
            const options = toMetricGetOptions(arguments);
            if (options) {  
                const path = toMetricGetPath(options, execId);
                return new Promise(function(resolve, reject) { 
                    var url = BaseUrl + path;
                    url += (path.indexOf('?') !== -1 ? '&' : '?') + "key=" + AgentKey;
                    request({ url: url }, function (error, response, body) {
                        if (error) {
                            reject(error);
                        } else if (response.statusCode !== 200) { 
                            reject('Invalid response code ' + response.statusCode);
                        } else if (body) {
                            var metric = JSON.parse(body);
                            if (options.key)
                                resolve(metric && metric.metricValueMap && metric.metricValueMap[options.key]);
                            else
                                resolve(metric && metric.metricValue);
                        } else {
                            reject('No response received for metric ' + options.name);
                        }
                    });
                }); 
            } else {
                return Promise.reject('Invalid parameters to results.get(name[, key])');
            }
        }
    };

    function doGetResult(options, start) {
        return answer.get(options).then(function(value) {
            if (_.isNumber(value) && options.condition(value))
                return Promise.resolve(value);
            else if (shouldContinuePolling(options, start)) {
                return delay(PollIntervalMs).then(function() {
                    return doGetResult(options, start);
                });
            } else {
                return Promise.reject(`Value ${value} for ${options.name} never matched condition specified`);
            }
        }, function(err) {
            if (shouldContinuePolling(options, start)) {
                return delay(PollIntervalMs).then(function() {
                    return doGetResult(options, start);
                });
            } else {
                return Promise.reject('Failed to get metric value that matches condition. Error: ' + err);
            }
        });
    }

    function shouldContinuePolling(options, start) {
        return !_.isNumber(options.timeout) || options.timeout === 0 || (Date.now() + PollIntervalMs - start < options.timeout);
    }

    answer.waitForCondition = function(options) {
        if (noRemote)
            return Promise.resolve();
        else if (!_.isFunction(options.condition))
            return Promise.reject('Must specify a condition function');
        else {
            const start = Date.now();
            return doGetResult(options, start);
        }
    };

    answer.waitForValue = function(options) {
        if (!options.value)
            options.value = info.execution ? info.execution.concurrentClients : 1;
        options.condition = function(val) { return val >= options.value; };
        return answer.waitForCondition(options);
    };

    answer.incrementAndWaitForValue = function(name, value) {
        return answer().counter({
            namespace: UserNs,
            name: name, 
            val: 1, 
            units: 'requests'
        }).then(function() {
            return answer.waitForValue({ 
                namespace: UserNs,
                name: name,
                value: value
            });
        });
    };

    answer.barrier = function(name, value) {
        return answer.incrementAndWaitForValue(name, value);
    };

    answer.current = answer();
    answer.current.setTraceStatus = function(status) {
        console.log('Trace status: ' + status);
    };
    answer.current.markAsSuccess = function() {
        console.log('Request marked as success');
    };
    answer.current.markAsFailure = function() {
        console.log('Request marked as failure');
    };

    return answer;
}

function sendResult(result) {
    return new Promise(function (resolve, reject) {
        if (process.env.TESTABLE_RESULT_FILE) {
            fs.writeFile(process.env.TESTABLE_RESULT_FILE, JSON.stringify(result) + '\n', { encoding: 'utf8', flag: 'a' }, resolve);
        } else {
            console.log('[Result] ' + JSON.stringify(result, null, '\t'));
            resolve();
        }
    });
}

module.exports = createResults;