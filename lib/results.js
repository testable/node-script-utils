const axios = require('axios');
const fs = require('fs').promises;
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

function toMetricOptions(args, hasKey) {
    if (args.length === 0) {
        return null;
    }
    let options;
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
    let options;
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
    let path = `/executions/${execId}/metric?name=${options.name}`;
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
            timing: async function() {
                const options = toMetricOptions(arguments);
                if (options)
                    return await sendResult({ 
                        type: 'Timing', 
                        data: { resource: resource, url: url, namespace: options.namespace, name: options.name, 
                            val: options.val, units: options.units } 
                    });
            },
            counter: async function() {
                const options = toMetricOptions(arguments);
                if (options)
                    return await sendResult({ 
                        type: 'Counter', 
                        data: { resource: resource, url: url, namespace: options.namespace, name: options.name, 
                            val: options.val, units: options.units } 
                    });
            },
            histogram: async function() {
                const options = toMetricOptions(arguments, true);
                if (options)
                    return await sendResult({ 
                        type: 'Histogram', 
                        data: { resource: resource, url: url,namespace: options.namespace, name: options.name, 
                            key: options.key, val: options.val } 
                    });
            },
            metered: async function() {
                const options = toMetricOptions(arguments, true);
                if (options)
                    return await sendResult({ 
                        type: 'Metered', 
                        data: { resource: resource, url: url,namespace: options.namespace, name: options.name, 
                            key: options.key, val: options.val, units: options.units } 
                    });
            }
        };
    };

    answer.get = async function() {
        const execId = Number(process.env.TESTABLE_EXECUTION_ID);
        if (noRemote || !execId) {
            return NaN;
        } else {
            const options = toMetricGetOptions(arguments);
            if (options) {  
                const path = toMetricGetPath(options, execId);
                let url = BaseUrl + path;
                url += (path.indexOf('?') !== -1 ? '&' : '?') + "key=" + AgentKey;
                const response = await axios.get(url);
                if (response.status !== 200) { 
                    throw new Error(`Invalid response code ${response.statusCode}`);
                } else if (response.data) {
                    const metric = response.data;
                    return options.key ? metric && metric.metricValueMap && metric.metricValueMap[options.key] : metric && metric.metricValue;
                } else {
                    throw new Error(`No response received for metric ${options.name}`);
                }
            } else {
                throw new Error('Invalid parameters to results.get(name[, key])');
            }
        }
    };

    async function doGetResult(options, start) {
        try {
            const value = await answer.get(options);
            if (_.isNumber(value) && options.condition(value))
                return value;
            else if (shouldContinuePolling(options, start)) {
                await delay(PollIntervalMs);
                return await doGetResult(options, start);
            } else {
                throw new Error(`Value ${value} for ${options.name} never matched condition specified`);
            }
        } catch(err) {
            if (shouldContinuePolling(options, start)) {
                await delay(PollIntervalMs);
                return await doGetResult(options, start);
            } else {
                throw new Error(`Failed to get metric value that matches condition. Error: ${err}`);
            }
        }
    }

    function shouldContinuePolling(options, start) {
        return !_.isNumber(options.timeout) || options.timeout === 0 || (Date.now() + PollIntervalMs - start < options.timeout);
    }

    answer.waitForCondition = async function(options) {
        if (noRemote)
            return;
        else if (!_.isFunction(options.condition))
            throw new Error('Must specify a condition function');
        else {
            const start = Date.now();
            return await doGetResult(options, start);
        }
    };

    answer.waitForValue = async function(options) {
        if (!options.value)
            options.value = info.execution ? info.execution.concurrentClients : 1;
        options.condition = function(val) { return val >= options.value; };
        return await answer.waitForCondition(options);
    };

    answer.incrementAndWaitForValue = async function(name, value) {
        await answer().counter({
            namespace: UserNs,
            name: name, 
            val: 1, 
            units: 'requests'
        });
        return await answer.waitForValue({ 
            namespace: UserNs,
            name: name,
            value: value
        });
    };

    answer.barrier = async function(name, value) {
        return await answer.incrementAndWaitForValue(name, value);
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

async function sendResult(result) {
    if (process.env.TESTABLE_RESULT_FILE) {
        await fs.writeFile(process.env.TESTABLE_RESULT_FILE, JSON.stringify(result) + '\n', { encoding: 'utf8', flag: 'a' });
    } else {
        console.log('[Result] ' + JSON.stringify(result, null, '\t'));
    }
}

module.exports = createResults;