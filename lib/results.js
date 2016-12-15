
function createResults(writeStream) {
    return function(resource, url) {
        return {
            timing: function(name, val, units) {
                sendResult(writeStream, { 
                    type: 'Timing', 
                    data: { resource: resource, url: url, name: name, val: val, units: units } 
                });
            },
            counter: function(name, val, units) {
                sendResult(writeStream, { 
                    type: 'Counter', 
                    data: { resource: resource, url: url, name: name, val: val, units: units } 
                });
            },
            histogram: function(name, key, val) {
                sendResult(writeStream, { 
                    type: 'Histogram', 
                    data: { resource: resource, url: url, name: name, key: key, val: val } 
                });
            }
        };
    };
}

function sendResult(writeStream, result) {
    if (writeStream) {
        writeStream.write(JSON.stringify(result) + '\n');
    } else {
        console.log('[Result] ' + JSON.stringify(result, null, '\t'));
    }
}

module.exports = createResults;