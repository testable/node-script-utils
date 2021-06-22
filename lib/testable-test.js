const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

class TestSteps {

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

    console.log('-------------');
    console.log('finish');
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
    console.log(suite.executeTestsImmediately);
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

    console.log('-------------');
    console.log('_executeSuite');
    console.log(suite.tests);
    await this._onSuiteStart(suite);

    if ( suite.tests )
      for ( const test of suite.tests ) {
        await this._executeTest(suite, test);
      }

    await this._onSuiteFinish(suite);
  }

  async _onSuiteStart(suite) {
    console.log('-------------');
    console.log('_onSuiteStart');
    const before = suite._before || this._before;
    if ( before )
      await this._executeFn(before);

    if ( this.cb.startSuite )
      this.cb.startSuite(suite);
  }

  async _onSuiteFinish(suite) {

    console.log('-------------');
    console.log('_onSuiteFinish');
    suite.finished = Date.now();
    suite.duration = Date.now() - suite.started;

    const after = suite._after || this._after;
    if ( after )
      await this._executeFn(after);

    this.suites.pop();
    console.log('-------------');
    console.log('this.cb.finishSuite');
    console.log(this.cb.finishSuite);
    if ( this.cb.finishSuite )
      this.cb.finishSuite(suite);
  }

  async _executeTest(suite, test) {
    console.log('--------------');
    console.log('_executeTest');
    const beforeEach = suite._beforeEach || this._beforeEach;
    if ( beforeEach )
      await this._executeFn(beforeEach);

    await this._executeStep(test.fn, suite, test);

    const afterEach = suite._afterEach || this._afterEach;
    if ( afterEach )
      await this._executeFn(afterEach);
  }

  async _executeStep(fn, suite, test) {
    console.log('--------------');
    console.log('_executeStep');
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
    console.log('--------------');
    console.log('_executeFn');
    console.log(fn.length);
    const isAsync = fn.constructor.name === 'AsyncFunction';
    if ( isAsync ) {
      console.log('inAsync');
      await fn();
    } else if ( fn.length === 1 ) {
      console.log('in if else');
      await new Promise(function (resolve, reject) {
        fn(function (err) {
          if ( err )
            reject(new Error(err));
          else
            resolve();
        });
      });
    } else {
      console.log('in fn');
      fn();
    }
  }

   callback = {
    startSuite: function (suite) {
      console.log('------ suite started');
      TestSteps.reportTestSuiteActions([{ type: 'StartSuite', data: suite }]);
    },
    finishSuite: function (suite) {
      console.log('------ suite started');
      TestSteps.reportTestSuiteActions([{ type: 'FinishSuite', data: suite }]);
    },
    startTest: function (test) {
      console.log('------ suite started');
      TestSteps.reportTestSuiteActions([{ type: 'StartSuiteTest', data: test }]);
    },
    finishTest: function (test) {
      console.log('------ suite started');
      TestSteps.reportTestSuiteActions([{ type: 'FinishSuiteTest', data: test }]);
    }
  }
  /*
  callback = function () {
    const self = this;
    return {
      startSuite: function (suite) {
        console.log('------ suite started');
        self.reportTestSuiteActions([{ type: 'StartSuite', data: suite }]);
      },
      finishSuite: function (suite) {
        console.log('------ suite started');
        self.reportTestSuiteActions([{ type: 'FinishSuite', data: suite }]);
      },
      startTest: function (test) {
        console.log('------ suite started');
        self.reportTestSuiteActions([{ type: 'StartSuiteTest', data: test }]);
      },
      finishTest: function (test) {
        console.log('------ suite started');
        self.reportTestSuiteActions([{ type: 'FinishSuiteTest', data: test }]);
      }
    }
  }
*/

  static reportTestSuiteActions(suiteActions) {
    console.log('---------')
    console.log('reportTestSuiteActions');
    TestSteps.sendMsg({
      type: "TestSuiteActions",
      data: suiteActions
    });
  }

  static sendMsg(result) {
    console.log('---------')
    console.log('sendMsg');
    return new Promise(function (resolve, reject) {
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

}

module.exports = TestSteps;
