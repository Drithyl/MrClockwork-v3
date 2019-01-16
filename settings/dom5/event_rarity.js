
const valueChecker = require("../../settings_value_checker.js");

const key = "eventRarity";
const name = "Event Rarity";
const expectedType = "IntRange";
const expectedValue = [1, 2];
const cue = `**${name}:**\n\n1 = common\n2 = rare`;

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
  return ["--eventrarity", setting];
};

module.exports.toInfo = function(setting)
{
  if (setting == 1)
  {
    return `${name}: common`;
  }

  else if (setting == 2)
  {
    return `${name}: rare`;
  }

  else return `${name}: incorrect value`;
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
