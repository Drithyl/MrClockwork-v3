
const valueChecker = require("../../settings_value_checker.js");

const key = "startingProvinces";
const name = "Starting Provinces";
const expectedType = "IntRange";
const expectedValue = [1, 9];
const cue = `**${name}:** Any integer between ${expectedValue[0]} and ${expectedValue[1]} (normally 1, indicates the amount of provinces that a nation starts with).`;

module.exports.getKey = function()
{
  return key;
};

module.exports.getName = function()
{
  return name;
};

module.exports.getCue = function()
{
  return cue;
};

module.exports.toExeArguments = function(setting)
{
  return ["--startprov", setting];
};

module.exports.toInfo = function(setting)
{
  return `${name}: ${setting}`;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  cb(null, input);
}
