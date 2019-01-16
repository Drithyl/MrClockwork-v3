
const valueChecker = require("../../settings_value_checker.js");

const key = "recruitment";
const name = "Recruitment Percentage";
const expectedType = "IntRange";
const expectedValue = [50, 300];
const cue = `**${name}:** Any integer between ${expectedValue[0]} and ${expectedValue[1]} (normally 100, indicates the percentage of recruitment points earned).`;

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
  return ["--recruitment", setting];
};

module.exports.toInfo = function(setting)
{
  return `${name}: ${setting}%`;
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
