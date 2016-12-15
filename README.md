# Testable Script Utilities

Helpful utilities for local testing when defining [Testable](https://testable.io) [Webdriver.io](https://www.webdriver.io) or Node.js scripts. Provides stubs for all the Testable specific APIs that are otherwise only available at runtime during test execution.

## Installation

Available on the public NPM registry as `testable-utils`.

```
npm install testable-utils --save
```

## Local Execution

When you run your script locally, any calls to Testable APIs will print to the console. During test execution via [Testable](https://testable.io) the API calls integrate as appropriate.

## APIs

### Capture Metrics

Capture custom metrics during your test. Testable supports 3 types of metrics. See our [custom metrics](https://testable.io/documentation/scripts/custom-metrics.html) documentation for more details. Note that these utils do not support traces yet.

#### Counter

`results([resource], [url]).counter(name, [increment], [units])`

Keep track of a counter across test execution. Increment defaults to 1. Resource and url default to blank and are included with the "overall results".

For example:

```javscript
var results = require('testable-utils').results;

results().counter('slowRequests', 1, 'requests');
```

#### Timing

`results([resource], [url]).timing(name, timeMs, [units])`

Capture a timing. Units defaults to `ms`. Resource and url default to blank and are included with the "overall results". Testable will calculate various aggergations like min, max, average, standard deviation, and the percentiles defined in your test configuration.

For example:

```javscript
var results = require('testable-utils').results;

results('Google Homepage', 'https://www.google.com').timing('pageLoadMs', 1294);
```

#### Histogram

`results([resource], [url]).histogram(name, bucket, [increment])`

Capture a histogram. Increment defaults to 1. Resource and url default to blank and are included with the "overall results".

For example:

```javscript
var results = require('testable-utils').results;

results().histogram('httpResponseCodes', 200);
```

### Stopwatch

Utility API to time how long a piece of code takes to execute and capture as a Testable metric.

For example:

```javascript
var timing = require('testable-utils').timing;

timing(function(done) {
  // some code we want to time here
  // call done() once it is done, can be async
  done();
}, 'myCustomTimer');
```

### Logging

By default all Webdriver.io output to `stdout` and `stderr` is logged at the `debug` level during test execution. To log at higher log levels use this API.

Examples:

```javascript
var log = require('testable-utils').log;

log.info("Some useful info");
log.error("Whoops something went wrong");
log.fatal("Something went really wrong, lets abort the entire test");
```

### Execution Info

Information about the test context in which this test is executing. See the [Testable docs](https://testable.io/documentation/scripts/write-script.html#execution-info) for more details.

When executed locally the info is set to dummy values.

Accessible at:

```javascript
// Information on chunk, concurrent client, execution, data stores, iteration, etc
var info = require('testable-utils').info;

// true when run locally, false when run on testable
var isLocal = require('testable-utils').isLocal;
```
