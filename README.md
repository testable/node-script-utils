# Testable Script Utilities

A set of utility APIs for use while running [Testable](https://testable.io) scenarios ([Webdriver.io](http://www.webdriver.io) or Node.js script).

* [Custom metrics](#capture-metrics)
  * [Counter](#counter)
  * [Timing](#timing)
  * [Histogram](#histogram)
  * [Metered](#metered)
* [Synchronizing across concurrent users](#synchronizing-across-concurrent-users)
  * [Barriers](#barriers)
  * [Get execution wide metric value](#get-execution-wide-metric-value)
  * [Wait for metric value](#wait-for-metric-value)
* [Stopwatch](#stopwatch)
* [Logging](#logging)
* [Execution Info](#execution-info)
* [CSV](#csv)
  * [Get row by index](#get-row-by-index)
  * [Get random row](#get-random-row)
  * [Iterate CSV](#iterate-csv)
* [Async code](#async-code)
* [Manual live event](#manual-live-event)
* [Test Framework Syntax](#test-framework-syntax)
* [Wait for finish](#wait-for-finish)
* [Webdriver.io custom commands](#webdriverio-commands)
  * [Screenshots](#screenshots)

## Installation

Available on the public NPM registry as `testable-utils`.

```
npm install testable-utils --save
```

## Local Testing

When you run your script locally, any calls to Testable APIs will print to the console. During actual test execution via [Testable](https://testable.io) test runners the API calls integrate as expected.

If you are using Webdriver.io with our custom commands you will need to add the following in your `wdio.conf.js` file to ensure they get registered:

```
...
before: function (capabilities, specs, browser) {
	require('testable-utils').init();
},
...
```

## APIs

### Capture Metrics

Capture custom metrics during your test. Testable supports 3 types of metrics. See our [custom metrics](https://testable.io/documentation/scripts/custom-metrics.html) documentation for more details. Note that these utils do not support traces yet.

#### Counter

```javscript
results([resource], [url]).counter(name, [increment], [units])
results([resource], [url]).counter(options)
```

Keep track of a counter across test execution. Namespace defaults `User`. Increment defaults to 1. Resource and url default to blank and are included with the "overall results".

For example:

```javscript
const results = require('testable-utils').results;

results().counter('slowRequests', 1, 'requests');
results().counter({ namespace: 'User', name: 'fastRequests', val: 2, units: 'requests' });
```

#### Timing

```javscript
results([resource], [url]).timing(name, timing, [units])
results([resource], [url]).timing(options)
```

Capture a timing. Namespace defaults to `User`. Units defaults to `ms`. Resource and url default to blank and are included with the "overall results". Testable will calculate various aggergations like min, max, average, standard deviation, and the percentiles defined in your test configuration.

For example:

```javscript
const results = require('testable-utils').results;

results('Google Homepage', 'https://www.google.com').timing('pageLoadMs', 1294);
results().timing({ namespace: 'User', name: 'latencyMs', val: 196, units: 'ms' });
```

#### Histogram

```javscript
results([resource], [url]).histogram(name, bucket, [increment])
results([resource], [url]).histogram(options)
```

Capture a histogram. Namespace defaults to `User`. Increment defaults to 1. Resource and url default to blank and are included with the "overall results".

For example:

```javscript
const results = require('testable-utils').results;

results().histogram('httpResponseCodes', 200);
results().histogram({ namespace: 'User', name: 'bandwidthByType', key: 'text/html', val: 1928 });
```

#### Metered

```javscript
results([resource], [url]).metered(name, bucket, val, [units])
results([resource], [url]).metered(options)
```

A metered metric is intended to capture live utilization of a resource in a particular bucket. Testable uses metered metrics to capture CPU utilization, memory utilization, active connections, and bandwidth per test runner.

Testable will calculate the peak value across all buckets in each 10 second time interval during the test. For example, this can be used to observe the test runner with the highest CPU utilization.

Namespace defaults to `User`. Resource and url default to blank and are included with the "overall results".

For example:

```javscript
const results = require('testable-utils').results;
const info = require('testable-utils').info;

results().metered('Browser Heap Memory', `User ${info.globalClientIndex} - Chrome`, 1025781, 'bytes');
```

### Synchronizing Across Concurrent Users

Testable provides several APIs to assist in coordinating across the concurrent users that are part of your test. These APIs are only available for browser-based tests and not protocol level Node.js scripts.

#### Barriers

Returns a promise that will not resolve until all concurrent users globally reach this barrier.

```javscript
results.barrier(name, [value]);
```

For example:

```javascript
await results.barrier('Login');
// continue executing after all users reach the "Login" barrier.
```

Optionally accepts a ```value``` as the second parameter if you do not expect all concurrent users globally to reach this barrier.

#### Get execution wide metric value

```javascript
results.get(name, [bucket])
results.get(options)
```

Read the current value of a metric aggregated across the entire test execution.

For example to read the current value of the ```Slow Requests``` custom counter metric:

```javascript
let value = await results.get('Slow Requests');
// use the value here

value = results.get({ namespace: 'User', name: 'Slow Requests' });
// use the value here
```

#### Wait for metric value

```javascript
results.waitForValue(options)
results.incrementAndWaitForValue(options)
```

Wait for the indicated metric to be greater than or equal to the specified value across the entire test execution or for the timeout to be reached. Returns a Promise object. When run locally or in a smoke test it will resolve successfully immediately.

If you use the ```incrementAndWaitForValue``` variation it will first increment a counter by 1 with the given name and then wait for the global value to reach the specified threshold.

The options object can include:

* `namespace`: Namespace of the metric. Defaults to `Testable` for system metrics and `User` otherwise.
* `name`: Metric name
* `value`: The value the metric must be greater than or equal to before the Promise resolves successfully. Required.
* `timeout`: Optional timeout (in milliseconds) after which to fail and stop waiting. Defaults to 0 (i.e. no timeout).
* `key`: Bucket to get the metric for. Not applicable for counters but required for histogram and timing metrics

For example to wait on the value of the counter `Slow Requests` to be >= 2:

```javascript
results().counter('Slow Requests', 1, 'requests');
await results.waitForValue({ namespace: 'User', name: 'Slow Requests', value: 2, timeout: 10000 });
// called when the metric reaches at least 2 aggregated across the test execution or immediately when run locally or in a smoke test
```

### Stopwatch

Utility API to time how long a piece of code takes to execute and capture as a Testable metric.

For example:

```javascript
const stopwatch = require('testable-utils').stopwatch;

await stopwatch(function(done) {
  // some code we want to time here
  // call done() once it is done, can be async
  done();
}, { namespace: 'User', name: 'myCustomTimer' });
// called after done() is invoked
```

### Logging

By default all Webdriver.io output to `stdout` and `stderr` is logged at the `debug` level during test execution. To log at other log levels use this API.

Examples:

```javascript
const log = require('testable-utils').log;

log.trace("This will only be captured during a smoke test or when run locally");
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
const info = require('testable-utils').info;

// true when run locally, false when run on testable
const isLocal = require('testable-utils').isLocal;
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
const dataTable = require('testable-utils').dataTable;
const result = await dataTable
	.open('data.csv')
	.get(1);
// Example:
// { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] }
console.log('Symbol: ' + result.data['Symbol']);
```

#### Get random row

Gets a random row from the CSV file. `random()` return a `Promise`.

```javascript
const dataTable = require('testable-utils').dataTable;
const result = await dataTable
	.open('data.csv')
	.random();
// Example:
// { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] }
console.log('Symbol: ' + result.data['Symbol']);
```

#### Iterate CSV

Iterate over the CSV file, retrieving 1 or more rows. The iterator is global across the entire test execution.

The `next()` function takes an optional `options` object that supports the following properties:

* `rows`: The number of rows to return. Defaults to 1.

```javascript
const dataTable = require('testable-utils').dataTable;
const results = await dataTable
	.open('data.csv')
	.next({ rows: 1 });
// Example:
// [ { index: 1, data: { Symbol: 'MSFT', Price: '100' }, indexed: [ 'MSFT', '100' ] } ]
console.log('Symbol: ' + results[0].data['Symbol']);
```

### Async Code

**Node.js Only**

When running a Node.js script on Testable and use a 3rd party module that performs async actions you might need to tell Testable when the action is finished. Testable automatically instruments many modules so you don't need to do this including async, http, https, request, net, ws, socketio, engineio, tls, setTimeout, setInterval.

For other async code use the below.

```javascript
const execute = require('testable-utils').execute;
execute(function(finished) {
	// my async code here, call finished() when done
	// ...
	finished();
});
```

### Manual Live Event

You can manually trigger an event while a test is running from the test results page (action menu => Send Live Event) or our API. Your script can listen for this event and perform an action in response. This is useful if you want to have all the virtual users perform an action at the exact same time for example. The event name/contents can be whatever you want.

For local testing and smoke testing on Testable, you can also trigger the event in your script by checking the `isLocal` and `isSmokeTest` boolean variables.

Example (Node.js):

```javascript
const axios = require('axios');
const testableUtils = require('testable-utils');
const fireNow = testableUtils.isLocal || testableUtils.isSmokeTest;
const events = testableUtils.events;
const execute = testableUtils.execute;

execute((finished) => {
  events.on('my-event', async (symbol) => {
    axios.get(`http://sample.testable.io/stocks/${symbol}`);
    events.finish()
    finished();
  });
});

if (fireNow) {
    // trigger the event when smoke testing or run locally for testing
    events.emit('my-event', 'MSFT');
    events.finish()
}
```

Example (Webdriver.io):

```javascript
const testableUtils = require('testable-utils');
const fireNow = testableUtils.isLocal || testableUtils.isSmokeTest;

describe('Load Url Requested in Event', function() {
  it('should load url', async () => {
    browser.testableLogInfo('Waiting on load-url event');
    // no timeout (0), use Google url for local/smoke testing
    const url = browser.testableWaitForEvent('load-url', 0, 'https://google.com');
    await browser.url(url);
    await browser.testableScreenshot('Requested Url');
  });
});
```

### Test Framework Syntax

Structure your tests using the familiar Mocha.js test case syntax. When run on the Testable platform you will be able to see a test case report of all test steps including pass/fail status, duration, and error details on failure.


For Example:

```javascript
const testableUtils = require('testable-utils');
const describe = testableUtils.describe;
const it = testableUtils.it;
// await if there is any async code in your tests
await describe('My example test suite', function() {
    it('First test step', async function() {
        await driver.get('http://www.google.com'); // Selenium javascript example code
    });
});
```

Full API:

```javascript
describe(suite, fn); // fn should be a function that contains a sequence of it() blocks
it(test, fn); // fn executes a single test step
beforeEach(fn); // runs before each test step (it block)
afterEach(fn); // runs after each test step (it block)
before(fn); // runs before each suite (describe block)
after(fn); // runs after each suite (describe block)
```

### Wait For Finish

Use this function to wait for the remainder of the test duration before the script finishes. Returns a Promise so that you can run some cleanup code before the script exits.

For tests configured for a set number of iterations the promise resolved immediately. Otherwise the promise will not resolve until the remaining duration has passed.

```
const testableUtils = require('testable-utils');
await testableUtils.waitForFinish();
console.log('finished!');
```

## Webdriver.io Commands

All of the API calls above are registered as <a target="_blank" href="http://webdriver.io/guide/usage/customcommands.html">custom commands</a> with Webdriver.io.

Simply include `const testableUtils = require('testable-utils');` in you test spec or in one of the <a target="_blank" href="http://webdriver.io/guide/testrunner/configurationfile.html">configuration file hooks</a> like `onPrepare()` and all the below custom commands will automatically get registered.

Note that all the Webdriver.io commands can be used in a synchronous fashion.

### Screenshots

One command that has no `testable-utils` equivalent is `await browser.testableScreenshot(name)`. This command takes a screenshot and puts it in the output directory to be collected as part of the test results. It also includes a prefix to make it easier to identify: `[region]-[chunk]-[user]-[iteration]-[name].png`. Tests are broken up into chunks, and within each chunk users and iterations are numbered starting at 0. So for example `us-east-1-123-0-0-MyHomePage.png` would be chunk id 123, first user, first iteration, image name `MyHomePage`.

### Command Mappings

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
		<td><pre>const result =
  browser.testableCsvGet(csvFile, index);</pre></td>
		<td><a href="#get-row-by-index"><pre>const result = await dataTable
  .open(csvFile)
  .get(index);</pre></a></td>
	</tr>
	<tr>
		<td><pre>const result =
  browser.testableCsvRandom(csvFile);</pre></td>
		<td><a href="#get-random-row"><pre>const result = await dataTable
  .open(csvFile)
  .random();</pre></a></td>
	</tr>
	<tr>
		<td><pre>const results =
  browser.testableCsvNext(csvFile[, options]);</pre></td>
		<td><a href="#get-random-row"><pre>const result = await dataTable
  .open(csvFile)
  .random([options]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>const result =
  browser.testableResult([resource], [url]);
browser.testableCounter(
  result,
  name,
  [increment],
  [units]);</pre></td>
		<td><a href="#counter"><pre>results([resource], [url])
  .counter(name, [increment], [units]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>const result =
  browser.testableResult([resource], [url]);
browser.testableTiming(
  result,
  name,
  timing,
  [units]);</pre></td>
		<td><a href="#timing"><pre>results([resource], [url])
  .timing(name, timing, [units]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>const result =
  browser.testableResult([resource], [url]);
browser.testableHistogram(
  result,
  name,
  bucket,
  [increment]);</pre></td>
		<td><a href="#histogram"><pre>results([resource], [url])
  .histogram(name, bucket, [increment]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableLogTrace(msg);</pre></td>
		<td><a href="#logging"><pre>log.trace(msg);</pre></a></td>
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
		<td><pre>browser.testableWaitForEvent(eventName[, timeout[, defaultVal]]);</pre></td>
		<td><a href="#manual-live-event"><pre>events.on(eventName);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableGetMetric(options);</pre></td>
		<td><a href="#get-execution-wide-metric-value"><pre>results.get(options);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableWaitForValue(options);</pre></td>
		<td><a href="#wait-for-metric-value"><pre>results.waitForValue(options);</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableWaitForFinish();</pre></td>
		<td><a href="#wait-for-finish"><pre>await testableUtils.waitForFinish();</pre></a></td>
	</tr>
	<tr>
		<td><pre>browser.testableBarrier(name, [value]);</pre></td>
		<td><a href="#barriers"><pre>results.barrier(name, [value]);</pre></a></td>
	</tr>
	<tr>
		<td><pre>// blocks until done() is called
browser.testableStopwatch(function(done) {
  // some code to time
  done();
}, metricName, [resource]);</pre></td>
		<td><a href="#stopwatch"><pre>// returns Promise immediately
stopwatch(function(done) {
  // some code to time
  done();
}, metricName, [resource]);</pre></a></td>
	</tr>
</table>
