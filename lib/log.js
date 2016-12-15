function createLog(writeStream) {
    return {
        debug: function() {
            sendLog(writeStream, "Debug", Array.prototype.join.call(arguments, ''));
        },
        info: function() {
            sendLog(writeStream, "Info", Array.prototype.join.call(arguments, ''));
        },
        error: function(msg) {
            var args = _.map(arguments, function(arg) { helper.toErrorContent(arg); });
            sendLog(writeStream, "Error", msg.stack || Array.prototype.join.call(args, ''));
        },
        fatal: function(msg) {
            var args = _.map(arguments, function(arg) { helper.toErrorContent(arg); });
            sendLog(writeStream, "Fatal", msg.stack || Array.prototype.join.call(args, ''));
        }
    };
}

function sendLog(writeStream, level, msg) {
    if (writeStream) {
        writeStream.write(JSON.stringify({
            type: "Log", 
            data: {
                level: level,
                message: helper.toErrorContent(msg),
                timestamp: Date.now()
            }
        }) + '\n');
    } else {
        console.log('[' + level + '] ' + helper.toErrorContent(msg));
    }
}

module.exports = createLog;