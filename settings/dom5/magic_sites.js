
const valueChecker = require("../../settings_value_checker.js");

const key = "magicSites";
const name = "Magic Sites";
const expectedType = "IntRange";
const expectedValue = [0, 75];
const cue = `**${name}:** any integer between ${expectedValue[0]} and ${expectedValue[1]} (the default is 60 for EA, 50 for MA and 40 for LA).`;

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
  return ["--magicsites", setting];
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
