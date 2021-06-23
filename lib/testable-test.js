const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
var _ = require('lodash');

class TestSteps {

  constructor() {
    this.cb = {
      startSuite: (suite) => {
        this.reportTestSuiteActions('StartSuite', suite);
      },
      finishSuite: (suite) => {
        this.reportTestSuiteActions('FinishSuite', suite);
      },
      startTest: (test) => {
        this.reportTestSuiteActions('StartSuiteTest', test);
      },
      finishTest: (test) => {
        this.reportTestSuiteActions('FinishSuiteTest', test);
      }
    };

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
    const suite = this._createSuite(this._getSuitePrefix() + suiteName, false);
    fn();
    await this._executeSuite(suite);
  }

  async it(testName, fn) {
    let suite = this.currentSuite;
    if ( !suite ) {
      suite = this._createSuite('Default Suite', true);
      await this._onSuiteStart(suite);
    }
    let test = this._createTest(suite, testName, fn);
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
        test.errorTrace = this.toErrorTrace(err);
    }
    test.finished = Date.now();
    test.duration = Date.now() - test.started;

    if ( this.cb.finishTest )
      this.cb.finishTest(test, suite);
  }

  async _executeFn(fn) {
    const isAsync = fn.constructor.name === 'AsyncFunction';
    if ( isAsync ) {
      await fn();
    } else if ( fn.length === 1 ) {
      await new Promise((resolve, reject) => {
        fn((err) => {
          if ( err )
            reject(new Error(err));
          else
            resolve();
        });
      });
    } else {
      fn();
    }
  }

  reportTestSuiteActions(type, contents) {
    const currentSuite = this.currentSuite;
    if ( currentSuite && type === 'FinishSuiteTest' && contents && contents.state === 'failed' )
      currentSuite.hasError = true;

    const result = { type: type, data: contents };
    return new Promise((resolve, reject) => {
      if ( process.env.TESTABLE_RESULT_FILE ) {
        fs.writeFile(process.env.TESTABLE_RESULT_FILE, JSON.stringify(result) + '\n', {
          encoding: 'utf8',
          flag: 'a'
        }, resolve);
      } else {
        console.log('[Result] ' + JSON.stringify(result, null, '\t'));
        resolve();
      }
    });
  }

  toErrorTrace(exception) {
    let answer = (exception.message || exception.errorType) + '\n';
    _.forEach(exception.stackTrace, (traceLine) => {
      answer += '  at ' + traceLine.declaringClass + '.' + traceLine.methodName +
        '(' + traceLine.fileName + ':' + traceLine.lineNumber + ')\n';
    });
    return answer;
  }
}

module.exports = TestSteps;
