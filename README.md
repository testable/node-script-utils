# Testable Script Utilities

A set of utility APIs for use while running [Testable](https://testable.io) scenarios ([Webdriver.io](http://www.webdriver.io) or Node.js script).

* Custom Metrics
* Stopwatch
* Logging
* Execution Info

## Installation

Available on the public NPM registry as `testable-utils`.

```
npm install testable-utils --save
```

## Local Testing

When you run your script locally, any calls to Testable APIs will print to the console. During actual test execution via [Testable](https://testable.io) test runners the API calls integrate as expected.

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

### CSV

Read one or more rows from a CSV file. When run locally it looks for the CSV file on the local filesystem. When run on Testable, make sure you upload the CSV to the scenario.

The API is as described in the [Testable documentation](https://testable.io/documentation/scripts/upload-data.html#datatable-module).

For the below examples we will use a `data.csv` file:

```
Symbol,Price
MSFT,100
IBM,101
GOOG,600
```

See the [Testable documentation](https://testable.io/documentation/scripts/upload-data.html#datatable-module) for full details of the options.

#### Get row by index

Gets a row from the CSV file by index. **Indices start at 1**. `get()` return a `Promise`.

```javascript
var dataTable = require('testable-utils').dataTable;
dataTable
	.open('data.csv')
	.get(1)
	.then(function(result) {
		// Example:
		// { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] }
		console.log('Symbol: ' + result.data['Symbol']);
	});
```

#### Get random row

Gets a random row from the CSV file. `random()` return a `Promise`.

```javascript
var dataTable = require('testable-utils').dataTable;
dataTable
	.open('data.csv')
	.random()
	.then(function(result) {
		// Example:
		// { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] }
		console.log('Symbol: ' + result.data['Symbol']);
	});
```

#### Iterate CSV

Iterate over the CSV file, retrieving 1 or more rows. The iterator is global across the entire test execution. See [Testable documentation](https://testable.io/documentation/scripts/upload-data.html#datatable-module) for full set of options. `next()` return a `Promise`.

```javascript
var dataTable = require('testable-utils').dataTable;
dataTable
	.open('data.csv')
	.next()
	.then(function(result) {
		// Example:
		// { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] }
		console.log('Symbol: ' + result.data['Symbol']);
	});
```

#### Webdriver.io Compatibility

Webdriver.io expects synchronous code. To handle async code like this CSV API, the <a target="blank" href="http://webdriver.io/api/utility/call.html">call()</a> function is provided.

```javascript
var symbol = browser.call(function() {
	return dataTable
		.open('data.csv')
		.next()
		.then(function(result) {
			return result.data['Symbol'];
		});
});
```
