
const rw = require("./reader_writer.js");

module.exports.check = function(input, expectedValue, expectedType)
{
  switch(expectedType.toLowerCase().trim())
  {
    case "regexp":
    return checkRegexp(input, expectedValue);

    case "int":
    return checkInt(input, expectedValue);

    case "intset":
    return checkIntSet(input, expectedValue);

    case "intrange":
    return checkIntRange(input, expectedValue);

    default:
    rw.logError(`Module: ${module.filename}\nCaller: module.exports.check()\n\n\tThe expectedType could not be matched in the switch. JSON data must be wrong.`);
    return null;
  }
}

function checkRegexp(input, regexp)
{
  var regexp;
  if (Array.isArray(regexp) === false && typeof regexp === "object")
  {
    return regexp.test(input);
  }

  if (Array.isArray(regexp) === true)
  {
    regexp = new RegExp(regexp[0], regexp[1])
  }

  else regexp = new RegExp(regexp);

  return regexp.test(input);
}

function checkInt(input, expectedValue)
{
  if (Number.isInteger(+input) === true && +input === +expectedValue)
  {
    return true;
  }

  else return false;
}

function checkIntSet(input, expectedSet)
{
  if (Number.isInteger(+input) === true && (expectedSet.includes(input) === true || expectedSet.includes(+input) === true))
  {
    return true;
  }

  else return false;
}

function checkIntRange(input, expectedRange)
{
  if (Number.isInteger(+input) === true && +input >= +expectedRange[0] && +input <= +expectedRange[1])
  {
    return true;
  }

  else return false;
}
