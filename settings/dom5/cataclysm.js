
const valueChecker = require("../../settings_value_checker.js");

const key = "cataclysm";
const name = "Cataclysm";
const expectedType = "IntRange";
const expectedValue = [0, 999];
const cue = `**${name}:** any integer between ${expectedValue[0]} and ${expectedValue[1]}.`;

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
  return [`--cataclysm`, setting];
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
