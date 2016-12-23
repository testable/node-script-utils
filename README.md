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

`results([resource], [url]).timing(name, timing, [units])`

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
var stopwatch = require('testable-utils').stopwatch;

stopwatch(function(done) {
  // some code we want to time here
  // call done() once it is done, can be async
  done();
}, 'myCustomTimer').then(function() {
	// called after done() is invoked
});
```

### Logging

By default all Webdriver.io output to `stdout` and `stderr` is logged at the `debug` level during test execution. To log at higher log levels use this API.

Examples:

```javascript
var log = require('testable-utils').log;

log.debug("Some useful debug");
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
	.then(function(results) {
		// Example:
		// [ { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] } ]
		console.log('Symbol: ' + results[0].data['Symbol']);
	});
```

## Webdriver.io Commands

All of the API calls above are registered as <a target="_blank" href="http://webdriver.io/guide/usage/customcommands.html">custom commands</a> with Webdriver.io.

Simply include `var testableUtils = require('testable-utils');` in you test spec or in one of the <a target="_blank" href="http://webdriver.io/guide/testrunner/configurationfile.html">configuration file hooks</a> like `onPrepare()` and all the below custom commands will automatically get registered.

Note that all the Webdriver.io commands can be used in a synchronous fashion.

<table>
	<tr>
		<th>Webdriver.io</th>
		<th>testable-utils</th>
	</tr>
	<tr>
		<td><pre>browser.testableInfo()</pre></td>
		<td><a href="#execution-info"><pre>info</pre></a></td>
	</tr>
	<tr>
		<td><pre>var result = browser.testableCsvGet(csvFile, index);</pre></td>
		<td><a href="#get-row-by-index"><pre>dataTable
  .open(csvFile)
  .get(index)
  .then(function(result) { ... }</pre></a></td>
	</tr>
	<tr>
		<td><pre>var result = browser.testableCsvRandom(csvFile);</pre></td>
		<td><a href="#get-random-row"><pre>dataTable
  .open(csvFile)
  .random()
  .then(function(result) { ... }</pre></a></td>
	</tr>
	<tr>
		<td><pre>var results = browser.testableCsvNext(csvFile[, options]);</pre></td>
		<td><a href="#get-random-row"><pre>dataTable
  .open(csvFile)
  .random([options])
  .then(function(results) { ... }</pre></a></td>
	</tr>
	<tr>
		<td><pre>var result = browser.testableResult([resource], [url]);
browser.testableCounter(result, name, [increment], [units]);</pre></td>
		<td><a href="#counter"><pre>results([resource], [url]).counter(name, [increment], [units]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>var result = browser.testableResult([resource], [url]);
browser.testableTiming(result, name, timing, [units]);</pre></td>
		<td><a href="#timing"><pre>results([resource], [url]).timing(name, timing, [units]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>var result = browser.testableResult([resource], [url]);
browser.testableHistogram(result, name, bucket, [increment]);</pre></td>
		<td><a href="#histogram"><pre>results([resource], [url]).histogram(name, bucket, [increment]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableLogDebug(msg);</pre></td>
		<td><a href="#logging"><pre>log.debug(msg);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableLogInfo(msg);</pre></td>
		<td><a href="#logging"><pre>log.info(msg);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableLogError(msg);</pre></td>
		<td><a href="#logging"><pre>log.error(msg);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableLogFatal(msg);</pre></td>
		<td><a href="#logging"><pre>log.fatal(msg);</pre></a></td>
	</tr>
	<tr>
		<td><pre>// blocks until done() is called
browser.testableStopwatch(function(done) {
  // some code to time
  done();
}, 'myCustomMetricMs');</pre></td>
		<td><a href="#stopwatch"><pre>// returns Promise immediately
stopwatch(function(done) {
  // some code to time
  done();
}, 'myCustomMetricMs');</pre></a></td>
	</tr>
</table>
