const Tail = require('always-tail');

const TailIntervalMs = 100;
const TailBlockSize = 10485760;

function watchForEvents(fileName, events, log) {
  const tail = new Tail(fileName, '\n', { start: 0, interval: TailIntervalMs, blockSize: TailBlockSize });
  tail.on('line', function (data) {
    if ( !data )
      return;
    try {
      const event = JSON.parse(data);
      if ( event.name ) {
        log.debug(`Received event ${event.name} with contents ${event.contents || ''}`);
        events.emit(event.name, event.contents);
      }
    } catch (err) {
      log.error(`Error processing live event ${data}`, helper.toErrorMessage(null, err));
    }
  });
  tail.on('error', function (data) {
    log.error('Error tailing live event', data);
  });
  tail.watch();
  events.finish = () => { tail.unwatch(); }
  return tail;
}

module.exports = watchForEvents;
