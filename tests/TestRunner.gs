/**
 * TestRunner.gs
 * Minimal test runner for Google Apps Script.
 *
 * Usage from Apps Script editor:
 *   runAllTests()
 *   runTestSuite_('Core Helpers', [testAsNumber_, testDateHelpers_])
 *
 * Test functions should throw an Error on failure. Assertion helpers live in
 * tests/Assert.gs and also throw on failure.
 */

var TEST_RUNNER_DEFAULT_OPTIONS_ = {
  stopOnFirstFailure: false,
  includeStack: true,
  logPassedTests: true,
};

/**
 * Main entrypoint. Add concrete test functions to this registry as modules grow.
 */
function runAllTests() {
  return runRegisteredTests_();
}

/**
 * Smoke-oriented entrypoint for quick manual checks from Apps Script editor.
 */
function runSmokeTests() {
  var tests = [];
  if (typeof smokeTestPhase1 === 'function') {
    tests.push(testCase_('smokeTestPhase1', smokeTestPhase1));
  }
  return runTestSuite_('Smoke Tests', tests);
}

/**
 * Registry of all test suites.
 *
 * Keep test registration explicit. Google Apps Script does not provide a safe
 * standard way to enumerate global functions consistently across runtimes.
 */
function getRegisteredTestSuites_() {
  var suites = [];

  suites.push({
    name: 'Test Utilities',
    tests: [
      testCase_('assertEquals_ passes for equal primitives', testAssertEqualsPasses_),
      testCase_('assertEquals_ throws for different primitives', testAssertEqualsThrows_),
      testCase_('assertDeepEquals_ compares nested objects', testAssertDeepEquals_),
      testCase_('assertContains_ supports arrays, strings, and objects', testAssertContains_),
      testCase_('assertThrows_ validates thrown messages', testAssertThrows_),
    ],
  });

  if (typeof smokeTestPhase1 === 'function') {
    suites.push({
      name: 'Existing Smoke Tests',
      tests: [testCase_('smokeTestPhase1', smokeTestPhase1)],
    });
  }

  return suites;
}

function runRegisteredTests_(options) {
  var opts = mergeTestRunnerOptions_(options);
  var startedAt = new Date();
  var suites = getRegisteredTestSuites_();
  var suiteResults = [];
  var total = 0;
  var passed = 0;
  var failed = 0;
  var skipped = 0;

  for (var i = 0; i < suites.length; i += 1) {
    var suiteResult = runTestSuite_(suites[i].name, suites[i].tests, opts);
    suiteResults.push(suiteResult);
    total += suiteResult.total;
    passed += suiteResult.passed;
    failed += suiteResult.failed;
    skipped += suiteResult.skipped;

    if (opts.stopOnFirstFailure && suiteResult.failed > 0) {
      break;
    }
  }

  var result = {
    ok: failed === 0,
    total: total,
    passed: passed,
    failed: failed,
    skipped: skipped,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: new Date().getTime() - startedAt.getTime(),
    suites: suiteResults,
  };

  logTestRunSummary_(result);
  return result;
}

function runTestSuite_(suiteName, tests, options) {
  var opts = mergeTestRunnerOptions_(options);
  var startedAt = new Date();
  var result = {
    name: suiteName || 'Unnamed Suite',
    ok: true,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tests: [],
  };

  if (!Array.isArray(tests)) {
    tests = [];
  }

  for (var i = 0; i < tests.length; i += 1) {
    var test = normalizeTestCase_(tests[i], i);
    var testResult = runSingleTest_(test, opts);
    result.tests.push(testResult);
    result.total += 1;

    if (testResult.status === 'passed') result.passed += 1;
    if (testResult.status === 'failed') result.failed += 1;
    if (testResult.status === 'skipped') result.skipped += 1;

    if (opts.stopOnFirstFailure && testResult.status === 'failed') {
      break;
    }
  }

  result.ok = result.failed === 0;
  result.durationMs = new Date().getTime() - startedAt.getTime();
  logTestSuiteSummary_(result);
  return result;
}

function runSingleTest_(test, options) {
  var opts = mergeTestRunnerOptions_(options);
  var startedAt = new Date();

  if (test.skip) {
    return {
      name: test.name,
      status: 'skipped',
      durationMs: 0,
      message: test.skipReason || 'Skipped',
    };
  }

  try {
    if (typeof test.fn !== 'function') {
      throw new Error('Test case is not a function: ' + test.name);
    }
    var value = test.fn();
    var passedResult = {
      name: test.name,
      status: 'passed',
      durationMs: new Date().getTime() - startedAt.getTime(),
    };
    if (typeof value !== 'undefined') {
      passedResult.value = value;
    }
    if (opts.logPassedTests) {
      logTestMessage_('PASS', test.name + ' (' + passedResult.durationMs + 'ms)');
    }
    return passedResult;
  } catch (error) {
    var failedResult = {
      name: test.name,
      status: 'failed',
      durationMs: new Date().getTime() - startedAt.getTime(),
      message: error && error.message ? error.message : String(error),
    };
    if (opts.includeStack && error && error.stack) {
      failedResult.stack = error.stack;
    }
    logTestMessage_('FAIL', test.name + ' — ' + failedResult.message);
    return failedResult;
  }
}

function testCase_(name, fn, options) {
  var opts = options || {};
  return {
    name: name || (fn && fn.name) || 'Unnamed Test',
    fn: fn,
    skip: opts.skip === true,
    skipReason: opts.skipReason || '',
  };
}

function skipTest_(name, reason) {
  return testCase_(name, function() {}, { skip: true, skipReason: reason || 'Skipped' });
}

function normalizeTestCase_(test, index) {
  if (typeof test === 'function') {
    return testCase_(test.name || 'Test #' + (index + 1), test);
  }
  if (test && typeof test === 'object') {
    return testCase_(
      test.name || (test.fn && test.fn.name) || 'Test #' + (index + 1),
      test.fn,
      {
        skip: test.skip === true,
        skipReason: test.skipReason,
      }
    );
  }
  return testCase_('Invalid Test #' + (index + 1), function() {
    throw new Error('Invalid test registration: ' + String(test));
  });
}

function mergeTestRunnerOptions_(options) {
  var merged = {};
  var source = options || {};
  Object.keys(TEST_RUNNER_DEFAULT_OPTIONS_).forEach(function(key) {
    merged[key] = TEST_RUNNER_DEFAULT_OPTIONS_[key];
  });
  Object.keys(source).forEach(function(key) {
    merged[key] = source[key];
  });
  return merged;
}

function logTestRunSummary_(result) {
  var status = result.ok ? 'PASS' : 'FAIL';
  logTestMessage_(status, 'Test run: ' + result.passed + '/' + result.total + ' passed, ' + result.failed + ' failed, ' + result.skipped + ' skipped, ' + result.durationMs + 'ms');
}

function logTestSuiteSummary_(result) {
  var status = result.ok ? 'PASS' : 'FAIL';
  logTestMessage_(status, 'Suite "' + result.name + '": ' + result.passed + '/' + result.total + ' passed, ' + result.failed + ' failed, ' + result.skipped + ' skipped, ' + result.durationMs + 'ms');
}

function logTestMessage_(level, message) {
  var line = '[' + level + '] ' + message;
  if (typeof console !== 'undefined' && console.log) {
    console.log(line);
  } else if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(line);
  }
}

/**
 * Self-tests for the assertion utilities.
 */
function testAssertEqualsPasses_() {
  assertEquals_('a', 'a');
  assertEquals_(1, 1);
  assertEquals_(true, true);
}

function testAssertEqualsThrows_() {
  assertThrows_(function() {
    assertEquals_('expected', 'actual');
  }, 'Expected values to be equal');
}

function testAssertDeepEquals_() {
  assertDeepEquals_(
    { a: 1, b: ['x', { y: 'z' }], c: new Date('2026-06-11T00:00:00Z') },
    { c: new Date('2026-06-11T00:00:00Z'), b: ['x', { y: 'z' }], a: 1 }
  );
}

function testAssertContains_() {
  assertContains_('AI Clinic Owner Copilot', 'Clinic');
  assertContains_(['tenant_id', 'clinic_id'], 'tenant_id');
  assertContains_({ tenant_id: 'tenant_demo' }, 'tenant_id');
}

function testAssertThrows_() {
  var error = assertThrows_(function() {
    throw new Error('boom test');
  }, /boom/);
  assertContains_(error.message, 'boom');
}
