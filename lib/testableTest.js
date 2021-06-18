
class TestableStartSuiteTest {

  suiteUuid;
  suiteName;
  uuid;
  name;
  started;

  constructor(startSuite, name, started) {
    this.suiteUuid = startSuite.getUuid();
    this.suiteName = startSuite.getName();
    this.uuid = uuidv4();
    this.name = name;
    this.started = started;
  }

  getSuiteUuid() { return this.suiteUuid; }

  getSuiteName() { return this.suiteName; }

  getUuid() { return this.uuid; }

  getName() { return this.name; }

  getStarted() { return this.started; }

}

class TestableStartSuite {

  uuid;
  name;
  started;

  constructor(name, started) {
    this.uuid = uuidv4();
    this.name = name;
    this.started = started;
  }

  getUuid() { return this.uuid; }

  getName() { return this.name; }

  getStarted() { return this.started; }

}

class TestableFinishSuite {

  uuid;
  name;
  finished = new Date().getMilliseconds();
  duration;
  hasError;

  constructor(start, hasError) {
    this.uuid = start.uuid();
    this.name = start.name();
    this.duration = new Date().getMilliseconds() - start.started();
    this.hasError = hasError;
  }

  getUuid() {
    return this.uuid;
  }

  getName() {
    return this.name;
  }

  getFinished() {
    return this.finished;
  }

  getDuration() { return this.duration; }

  isHasError() { return this.hasError; }
}

class TestableFinishSuiteTest {

  suiteUuid;
  suiteName;
  uuid;
  name;
  finished;
  duration;
  state;
  errorType;
  error;
  errorTrace;

  constructor(startSuiteTest, passed, e, captureTrace) {
    this.suiteUuid = startSuiteTest.getSuiteUuid();
    this.suiteName = startSuiteTest.getSuiteName();
    this.uuid = startSuiteTest.getUuid();
    this.name = startSuiteTest.getName();
    this.finished = startSuiteTest.getStarted() > 0 ? new Date().getMilliseconds() : 0;
    this.duration = startSuiteTest.getStarted() > 0 ? this.finished - startSuiteTest.started() : 0;
    this.state = e !== null ? "failed" : "passed";
    if ( e !== null ) {
      this.errorType = e.class().simpleName();
      this.error = e.message();
      if ( captureTrace ) {
        sw = new StringWriter();
        pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        this.errorTrace = sw.toString();
      } else {
        this.errorTrace = null;
      }
    } else {
      this.errorType = null;
      this.error = null;
      this.errorTrace = null;
    }
  }

  static passed(startSuiteTest) {
    return new TestableFinishSuiteTest(startSuiteTest, true, null, false);
  }

  static failed(startSuiteTest, e) {
    return new TestableFinishSuiteTest(startSuiteTest, false, e, true);
  }

  static failedException(startSuiteTest, msg) {
    return new TestableFinishSuiteTest(startSuiteTest, false, new Exception(msg), false);
  }

  getSuiteUuid() { return this.suiteUuid; }

  getSuiteName() { return this.suiteName; }

  getUuid() { return this.uuid; }

  getName() { return this.name; }

  getFinished() { return this.finished; }

  getDuration() { return this.duration; }

  getState() { return this.state; }

  getErrorType() { return this.errorType; }

  getError() { return this.error; }

  getErrorTrace() { return this.errorTrace; }
}

class TestableTest {
  startSuite;
  currentTest = null;
  hasError = false;

  constructor(name) {

    console.log('---------');
    console.log('---------');
    console.log('INSIDE CONSTRUCTOR');

    this.startSuite = new TestableStartSuite(name, new Date().getMilliseconds());
    TestableTest.write("StartSuite", this.startSuite);

  }

  runStep(name, step) {
    try {
      this.startStep(name);
      step.run();
      this.finishSuccessfulStep();
    } catch (e) {
      this.finishFailedStep(e);
    }
  }

  startStep(name) {
    this.currentTest = new TestableStartSuiteTest(this.startSuite, name, new Date().getMilliseconds());
    TestableTest.write('StartSuiteTest', this.currentTest);
  }

  finishSuccessfulStep() {
    this.finishStep(TestableFinishSuiteTest.passed(this.currentTest));
  }

  finishFailedStep(errorMsg) {
    this.finishStep(TestableFinishSuiteTest.failed(this.currentTest, errorMsg));
  }

  finishStep(finishMsg) {
    if ( this.currentTest !== null ) {
      TestableTest.write("FinishSuiteTest", finishMsg);
      if ( finishMsg.getError() !== null )
        this.hasError = true;
      this.currentTest = null;
    }
  }

  assertionPassed(assertion, duration) {
    this.currentTest = new TestableStartSuiteTest(this.startSuite, assertion, new Date().getMilliseconds() - duration);
    TestableTest.write("StartSuiteTest", this.currentTest);
    this.finishStep(TestableFinishSuiteTest.passed(this.currentTest));
  }

  assertionFailed(assertion, duration, errorMessage) {
    this.currentTest = new TestableStartSuiteTest(this.startSuite, assertion, new Date().getMilliseconds() - duration);
    TestableTest.write("StartSuiteTest", this.currentTest);
    this.finishStep(TestableFinishSuiteTest.failed(this.currentTest, errorMessage));
  }

  finish() {
    if ( this.currentTest !== null ) {
      TestableTest.write("FinishSuiteTest", TestableFinishSuiteTest.passed(this.currentTest));
    }
    TestableTest.write("FinishSuite", new TestableFinishSuite(this.startSuite, this.hasError));
  }

  static write(type, event) {
    // todo: pending writing the events
    // TestableTest.writeToStream()
  }
}

module.exports = TestableTest;

/*

const test = TestableSelenium.startTest("Google Related");
test.startStep("Open google home page");
driver.get("https://www.google.com");
test.finishSuccessfulStep(); // or test.finishFailedStep("My error message");
test.runStep("Open google news using Runnable", new Runnable() {
  run() {
    driver.get("https://news.google.com"); // any exception here gets logged as a test step failure
  }
});
test.finish();*/
