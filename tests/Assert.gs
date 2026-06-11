/**
 * Assert.gs
 * Lightweight assertion helpers for Google Apps Script tests.
 *
 * No external framework required. Throwing an Error marks a test as failed.
 */

function fail_(message, details) {
  var suffix = details ? ' | ' + safeStringifyForAssert_(details) : '';
  throw new Error((message || 'Assertion failed') + suffix);
}

function assertTrue_(condition, message) {
  if (condition !== true) {
    fail_(message || 'Expected condition to be true', { actual: condition });
  }
}

function assertFalse_(condition, message) {
  if (condition !== false) {
    fail_(message || 'Expected condition to be false', { actual: condition });
  }
}

function assertEquals_(expected, actual, message) {
  if (expected !== actual) {
    fail_(message || 'Expected values to be equal', {
      expected: expected,
      actual: actual,
    });
  }
}

function assertNotEquals_(unexpected, actual, message) {
  if (unexpected === actual) {
    fail_(message || 'Expected values to be different', {
      unexpected: unexpected,
      actual: actual,
    });
  }
}

function assertNull_(actual, message) {
  if (actual !== null) {
    fail_(message || 'Expected value to be null', { actual: actual });
  }
}

function assertNotNull_(actual, message) {
  if (actual === null || typeof actual === 'undefined') {
    fail_(message || 'Expected value to be non-null', { actual: actual });
  }
}

function assertUndefined_(actual, message) {
  if (typeof actual !== 'undefined') {
    fail_(message || 'Expected value to be undefined', { actual: actual });
  }
}

function assertDefined_(actual, message) {
  if (typeof actual === 'undefined') {
    fail_(message || 'Expected value to be defined', { actual: actual });
  }
}

function assertApproxEquals_(expected, actual, tolerance, message) {
  var delta = Math.abs(Number(expected) - Number(actual));
  var maxDelta = typeof tolerance === 'number' ? tolerance : 0.000001;
  if (isNaN(delta) || delta > maxDelta) {
    fail_(message || 'Expected values to be approximately equal', {
      expected: expected,
      actual: actual,
      tolerance: maxDelta,
      delta: delta,
    });
  }
}

function assertArrayEquals_(expected, actual, message) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) {
    fail_(message || 'Expected both values to be arrays', {
      expectedType: typeOfAssertValue_(expected),
      actualType: typeOfAssertValue_(actual),
    });
  }
  if (expected.length !== actual.length) {
    fail_(message || 'Expected arrays to have the same length', {
      expectedLength: expected.length,
      actualLength: actual.length,
      expected: expected,
      actual: actual,
    });
  }
  for (var i = 0; i < expected.length; i += 1) {
    if (!deepEqualsForAssert_(expected[i], actual[i])) {
      fail_(message || 'Expected arrays to be equal', {
        index: i,
        expected: expected[i],
        actual: actual[i],
      });
    }
  }
}

function assertDeepEquals_(expected, actual, message) {
  if (!deepEqualsForAssert_(expected, actual)) {
    fail_(message || 'Expected values to be deeply equal', {
      expected: expected,
      actual: actual,
    });
  }
}

function assertContains_(container, expectedValue, message) {
  var found = false;
  if (typeof container === 'string') {
    found = container.indexOf(String(expectedValue)) !== -1;
  } else if (Array.isArray(container)) {
    for (var i = 0; i < container.length; i += 1) {
      if (deepEqualsForAssert_(container[i], expectedValue)) {
        found = true;
        break;
      }
    }
  } else if (container && typeof container === 'object') {
    found = Object.prototype.hasOwnProperty.call(container, expectedValue);
  }

  if (!found) {
    fail_(message || 'Expected container to include value', {
      container: container,
      expectedValue: expectedValue,
    });
  }
}

function assertMatches_(actual, pattern, message) {
  var regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
  if (!regex.test(String(actual))) {
    fail_(message || 'Expected value to match pattern', {
      actual: actual,
      pattern: String(regex),
    });
  }
}

function assertThrows_(fn, expectedMessageOrRegex, message) {
  if (typeof fn !== 'function') {
    fail_(message || 'assertThrows_ expects a function', { actualType: typeof fn });
  }

  var didThrow = false;
  var thrownError = null;
  try {
    fn();
  } catch (error) {
    didThrow = true;
    thrownError = error;
  }

  if (!didThrow) {
    fail_(message || 'Expected function to throw');
  }

  if (typeof expectedMessageOrRegex !== 'undefined' && expectedMessageOrRegex !== null) {
    var actualMessage = thrownError && thrownError.message ? thrownError.message : String(thrownError);
    var matches = expectedMessageOrRegex instanceof RegExp
      ? expectedMessageOrRegex.test(actualMessage)
      : actualMessage.indexOf(String(expectedMessageOrRegex)) !== -1;
    if (!matches) {
      fail_(message || 'Thrown error message did not match expectation', {
        expected: String(expectedMessageOrRegex),
        actual: actualMessage,
      });
    }
  }

  return thrownError;
}

function assertDoesNotThrow_(fn, message) {
  if (typeof fn !== 'function') {
    fail_(message || 'assertDoesNotThrow_ expects a function', { actualType: typeof fn });
  }
  try {
    return fn();
  } catch (error) {
    fail_(message || 'Expected function not to throw', {
      error: error && error.message ? error.message : String(error),
    });
  }
}

function assertObjectHasKeys_(obj, keys, message) {
  assertNotNull_(obj, message || 'Expected object to be non-null');
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    fail_(message || 'Expected object', { actualType: typeOfAssertValue_(obj) });
  }
  if (!Array.isArray(keys)) {
    fail_(message || 'Expected keys to be an array', { keys: keys });
  }
  var missing = [];
  keys.forEach(function(key) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      missing.push(key);
    }
  });
  if (missing.length > 0) {
    fail_(message || 'Expected object to contain required keys', {
      missing: missing,
      object: obj,
    });
  }
}

function typeOfAssertValue_(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

function deepEqualsForAssert_(left, right) {
  if (left === right) return true;

  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (var i = 0; i < left.length; i += 1) {
      if (!deepEqualsForAssert_(left[i], right[i])) return false;
    }
    return true;
  }

  if (left && right && typeof left === 'object' && typeof right === 'object') {
    var leftKeys = Object.keys(left).sort();
    var rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    for (var j = 0; j < leftKeys.length; j += 1) {
      if (leftKeys[j] !== rightKeys[j]) return false;
      if (!deepEqualsForAssert_(left[leftKeys[j]], right[rightKeys[j]])) return false;
    }
    return true;
  }

  return false;
}

function safeStringifyForAssert_(value) {
  var seen = [];
  try {
    return JSON.stringify(value, function(key, item) {
      if (item && typeof item === 'object') {
        if (seen.indexOf(item) !== -1) return '[Circular]';
        seen.push(item);
      }
      if (item instanceof Error) {
        return { name: item.name, message: item.message, stack: item.stack };
      }
      return item;
    });
  } catch (error) {
    return String(value);
  }
}
