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

function createResults(writeStream) {
    return function(resource, url) {
        return {
            data: {
                resource: resource,
                url: url
            },
            timing: function() {
                const options = toMetricOptions(arguments);
                if (options)
                    return sendResult(writeStream, { 
                        type: 'Timing', 
                        data: { resource: resource, url: url, namespace: options.namespace, name: options.name, 
                            val: options.val, units: options.units } 
                    });
            },
            counter: function() {
                const options = toMetricOptions(arguments);
                if (options)
                    return sendResult(writeStream, { 
                        type: 'Counter', 
                        data: { resource: resource, url: url, namespace: options.namespace, name: options.name, 
                            val: options.val, units: options.units } 
                    });
            },
            histogram: function() {
                const options = toMetricOptions(arguments, true);
                if (options)
                    return sendResult(writeStream, { 
                        type: 'Histogram', 
                        data: { resource: resource, url: url,namespace: options.namespace, name: options.name, 
                            key: options.key, val: options.val } 
                    });
            }
        };
    };
}

function sendResult(writeStream, result) {
    return new Promise(function (resolve, reject) {
        if (writeStream) {
            writeStream.write(JSON.stringify(result) + '\n', 'utf8', resolve);
        } else {
            console.log('[Result] ' + JSON.stringify(result, null, '\t'));
            resolve();
        }
    });
}

module.exports = createResults;