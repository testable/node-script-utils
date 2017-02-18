var _ = require("lodash");

function toErrorContent(error) {
    if (_.isString(error))
        return error;
    if (_.isUndefined(error.message))
        return "Unknown error";
    switch (error.message) {
        case "Error: read ECONNRESET":
        case "Error: socket hang up":
            return "Connection closed unexpectedly";
        case "connect ETIMEDOUT":
            return "Connect timed out";
        default:
            return error.message;
    }
}

function createLog(writeStream) {
    return {
        trace: function() {
            return sendLog(writeStream, "Trace", Array.prototype.join.call(arguments, ''));
        },
        debug: function() {
            return sendLog(writeStream, "Debug", Array.prototype.join.call(arguments, ''));
        },
        info: function() {
            return sendLog(writeStream, "Info", Array.prototype.join.call(arguments, ''));
        },
        error: function(msg) {
            var args = _.map(arguments, function(arg) { toErrorContent(arg); });
            return sendLog(writeStream, "Error", msg.stack || Array.prototype.join.call(args, ''));
        },
        fatal: function(msg) {
            var args = _.map(arguments, function(arg) { toErrorContent(arg); });
            return sendLog(writeStream, "Fatal", msg.stack || Array.prototype.join.call(args, ''));
        }
    };
}

function sendLog(writeStream, level, msg) {
    return new Promise(function(resolve, reject) {
        if (writeStream) {
            writeStream.write(JSON.stringify({
                type: "Log", 
                data: {
                    level: level,
                    message: toErrorContent(msg),
                    timestamp: Date.now()
                }
            }) + '\n', 'utf8', resolve);
        } else {
            console.log('[' + level + '] ' + toErrorContent(msg));
            resolve();
        }
    });
}

module.exports = createLog;