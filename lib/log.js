var _ = require("lodash");
var  fs = require("fs");

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

function createLog() {
    return {
        trace: function() {
            return sendLog("Trace", Array.prototype.join.call(arguments, ''));
        },
        debug: function() {
            return sendLog("Debug", Array.prototype.join.call(arguments, ''));
        },
        info: function() {
            return sendLog("Info", Array.prototype.join.call(arguments, ''));
        },
        error: function(msg) {
            var args = _.map(arguments, function(arg) { return toErrorContent(arg); });
            return sendLog("Error", msg.stack || Array.prototype.join.call(args, ''));
        },
        fatal: function(msg) {
            var args = _.map(arguments, function(arg) { return toErrorContent(arg); });
            return sendLog("Fatal", msg.stack || Array.prototype.join.call(args, ''));
        }
    };
}

function sendLog(level, msg) {
    return new Promise(function(resolve, reject) {
        if (process.env.TESTABLE_RESULT_FILE) {
            fs.writeFile(process.env.TESTABLE_RESULT_FILE, JSON.stringify({
                type: "Log", 
                data: {
                    level: level,
                    message: toErrorContent(msg),
                    timestamp: Date.now()
                }
            }) + '\n', { encoding: 'utf8', flag: 'a' }, resolve);
        } else {
            console.log('[' + level + '] ' + toErrorContent(msg));
            resolve();
        }
    });
}

module.exports = createLog;