const { v4: uuidv4 } = require('uuid');
let VError = require('verror');
let util = require('util');
const _ = require("lodash");

const EarlyTerminationMsg = 'Connection closed early when test was stopped';


class TestSteps {

  requestsInProgress = 0;
  scriptRunning = false;
  activeResults = [];
  resultsById = new Map();

  constructor() {
    this.cb = this.callback;
    this.finish();
  }

  get currentSuite() {
    return this.suites.length > 0 ? this.suites[this.suites.length - 1] : null;
  }

  get currentTest() {
    const currentSuite = this.currentSuite;
    if ( !currentSuite || currentSuite.tests.length === 0 )
      return null;
    return currentSuite.tests[currentSuite.tests.length - 1];
  }

  async finish() {
    if ( this.suites )
      for ( const suite of this.suites ) {
        await this._onSuiteFinish(suite);
      }

    this.suites = [];
    this._before = null;
    this._beforeEach = null;
    this._after = null;
    this._afterEach = null;
  }

  async describe(suiteName, fn) {
    console.log('------------')
    console.log('describe')
    const suite = this._createSuite(this._getSuitePrefix() + suiteName, false);
    fn();
    await this._executeSuite(suite);
  }

  async it(testName, fn) {
    console.log('------------')
    console.log('it')
    let suite = this.currentSuite;
    console.log(suite.name);
    if ( !suite ) {
      suite = this._createSuite('Default Suite', true);
      await this._onSuiteStart(suite);
    }
    let test = this._createTest(suite, testName, fn);
    console.log(test);
    console.log(suite.executeTestsImmediately );
    if ( suite.executeTestsImmediately ) {
      await this._executeTest(suite, test);
      await this._onSuiteFinish(suite);
    } else
      suite.tests.push(test);
  }

  before(fn) {
    this._register('_before', fn);
  }

  beforeEach(fn) {
    this._register('_beforeEach', fn);
  }

  after(fn) {
    this._register('_after', fn);
  }

  afterEach(fn) {
    this._register('_afterEach', fn);
  }

  _getSuitePrefix() {
    if ( this.suites.length === 0 )
      return '';
    let answer = '';
    for ( const suite of this.suites )
      answer += `${suite.name} => `;
    return answer;
  }

  _register(hook, fn) {
    const suite = this.currentSuite;
    if ( suite )
      suite[hook] = fn;
    else
      this[hook] = fn;
  }

  _createSuite(suiteName, isDefault) {
    const suite = {
      uuid: uuidv4(),
      name: suiteName,
      tests: [],
      started: Date.now(),
      hasError: false,
      executeTestsImmediately: isDefault
    };
    this.suites.push(suite);
    return suite;
  }

  _createTest(suite, name, fn) {
    return {
      suiteUuid: suite.uuid,
      suiteName: suite.name,
      uuid: uuidv4(),
      name: name,
      fn: fn,
      started: Date.now()
    };
  }

  async _executeSuite(suite) {
    await this._onSuiteStart(suite);

    if ( suite.tests )
      for ( const test of suite.tests ) {
        await this._executeTest(suite, test);
      }

    await this._onSuiteFinish(suite);
  }

  async _onSuiteStart(suite) {
    const before = suite._before || this._before;
    if ( before )
      await this._executeFn(before);

    if ( this.cb.startSuite )
      this.cb.startSuite(suite);
  }

  async _onSuiteFinish(suite) {
    suite.finished = Date.now();
    suite.duration = Date.now() - suite.started;

    const after = suite._after || this._after;
    if ( after )
      await this._executeFn(after);

    this.suites.pop();
    if ( this.cb.finishSuite )
      this.cb.finishSuite(suite);
  }

  async _executeTest(suite, test) {
    const beforeEach = suite._beforeEach || this._beforeEach;
    if ( beforeEach )
      await this._executeFn(beforeEach);

    await this._executeStep(test.fn, suite, test);

    const afterEach = suite._afterEach || this._afterEach;
    if ( afterEach )
      await this._executeFn(afterEach);
  }

  async _executeStep(fn, suite, test) {
    if ( this.cb.startTest )
      this.cb.startTest(test, suite);

    try {
      await this._executeFn(fn);
      test.state = 'passed';
    } catch (err) {
      suite.hasError = true;
      test.state = 'failed';
      test.errorType = err.name;
      if ( err.message )
        test.error = err.message;
      if ( err.stack )
        test.errorTrace = this.toErrorContent(err);
    }
    test.finished = Date.now();
    test.duration = Date.now() - test.started;

    if ( this.cb.finishTest )
      this.cb.finishTest(test, suite);
  }

  async _executeFn(fn) {
    const isAsync = fn.constructor.name === 'AsyncFunction';
    if ( isAsync )
      await fn();
    else if ( fn.length === 1 )
      await new Promise(function (resolve, reject) {
        fn(function (err) {
          if ( err )
            reject(new Error(err));
          else
            resolve();
        });
      });
    else
      fn();
  }

  filterStackTrace(stack) {
    const lines = stack.split('\n');
    var answer = '';
    var hitScriptLine = false;
    _.forEach(lines, function (line) {
      var trimmedLine = line.trim();
      if (!hitScriptLine)
        answer += line + '\n';
      if (trimmedLine.indexOf('at script.js') === 0 || trimmedLine.indexOf('(script.js') > 0)
        hitScriptLine = true;
    });
    return answer;
  }

  toErrorContent(error, msgOnly) {
    if (_.isUndefined(error) || error === null)
      return "";
    if (_.isString(error))
      return error;
    if (!_.isError(error) && _.isBuffer(error))
      return error.toString();
    if (!_.isError(error) && _.isObject(error))
      return util.inspect(error);
    if (!_.isError(error))
      return '' + error;
    if (_.isUndefined(error.message))
      return "Unknown error";
    switch (error.message) {
      case "Error: read ECONNRESET":
      case "Error: socket hang up":
        return "Connection closed unexpectedly";
      case "connect ETIMEDOUT":
        return "Connect timed out";
      default:
        return msgOnly ? error.message : this.filterStackTrace(VError.fullStack(error));
    }
  }


  callback = function (){
    const self = this;
    return {
      startSuite: function(suite) {
        self.reportTestSuiteActions([ { type: 'StartSuite', data: suite }]);
        self._requestStarted();
      },
      finishSuite: function(suite) {
        self.reportTestSuiteActions([ { type: 'FinishSuite', data: suite }]);
        self._requestFinished();
      },
      startTest: function(test) {
        self.reportTestSuiteActions([ { type: 'StartSuiteTest', data: test }]);
        self._requestStarted();
      },
      finishTest: function(test) {
        self.reportTestSuiteActions([ { type: 'FinishSuiteTest', data: test }]);
        self._requestFinished();
      }
    }
  }

  _requestStarted(){
    console.log('---------')
    console.log('requestStarted');
    this.requestsInProgress = this.requestsInProgress + 1;
  }
  reportTestSuiteActions(suiteActions){
    console.log('---------')
    console.log('reportTestSuiteActions');
    this.sendMsg({
      type: "TestSuiteActions",
      data: suiteActions
    });
  }
  _requestFinished(result){
    console.log('---------')
    console.log('_requestFinished');
    this.requestsInProgress = this.requestsInProgress - 1;
    this.resultFinished(result);
    if (this.requestsInProgress === 0 && !this.scriptRunning) {
      // this._done();
    }
  }

  resultFinished(result, earlyTermination) {
    console.log('---------')
    console.log('resultFinished');
    if (_.isObject(result) && !result.isFinished) {
      if (earlyTermination && result.data.url) {
        result.setTraceStatus('Terminated Early', EarlyTerminationMsg);
        // result.addTrace('Error', {}, EarlyTerminationMsg);
      }
      result.finished();
      if (!result.isEmpty()) {
        this.sendMsg({
          type: "Result",
          data: result.data
        });
      }
      let index = this.activeResults.indexOf(result);
      if (index !== -1)
        this.activeResults.splice(index, 1);
      if (result.id)
        this.resultsById.delete(result.id);
    }
  }

  sendMsg(result){
    console.log('---------')
    console.log('sendMsg');
    return new Promise(function (resolve, reject) {
      if (process.env.TESTABLE_RESULT_FILE) {
        fs.writeFile(process.env.TESTABLE_RESULT_FILE, JSON.stringify(result) + '\n', { encoding: 'utf8', flag: 'a' }, resolve);
      } else {
        console.log('[Result] ' + JSON.stringify(result, null, '\t'));
        resolve();
      }
    });
  }

}

module.exports = TestSteps;


/*

const webdriver = require('selenium-webdriver');
const util = require('util');
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);
const path = require('path');
const { expect } = require('chai');

async function takeScreenshot(driver, file){
  let image = await driver.takeScreenshot();
  await writeFile(file, image, 'base64');
}

describe('DefaultTest', () => {
  let driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  it('should go to google.com and check title', async () => {
    await driver.get('https://www.google.com');
    await takeScreenshot(driver, path.join(process.env.OUTPUT_DIR || '.', 'HomePage.png'));
    const title = await driver.getTitle();
    expect(title).to.equal('Google');
  });

  after(async () => driver.quit());
});


{
  "name": "webdriver-testable-demo",
  "version": "0.0.1",
  "description": "Simple Webdriver Javascript Example",
  "author": "Testable",
  "devDependencies": {
  "testable-utils": "0.5.9",
    "selenium-webdriver": "3.6.0",
    "mocha": "8.1.3",
    "chai": "4.2.0"
}
}*/
