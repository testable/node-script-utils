
function createResults(writeStream) {
    return function(resource, url) {
        return {
            timing: function(name, val, units) {
                return sendResult(writeStream, { 
                    type: 'Timing', 
                    data: { resource: resource, url: url, name: name, val: val, units: units } 
                });
            },
            counter: function(name, val, units) {
                return sendResult(writeStream, { 
                    type: 'Counter', 
                    data: { resource: resource, url: url, name: name, val: val, units: units } 
                });
            },
            histogram: function(name, key, val) {
                return sendResult(writeStream, { 
                    type: 'Histogram', 
                    data: { resource: resource, url: url, name: name, key: key, val: val } 
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