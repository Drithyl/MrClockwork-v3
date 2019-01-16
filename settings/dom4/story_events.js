
const valueChecker = require("../../settings_value_checker.js");

const key = "storyEvents";
const name = "Story Events";
const expectedType = "IntRange";
const expectedValue = [0, 1];
const cue = `**${name}:**\n\n0 = off\n1 = on`;

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
  if (setting == 1)
  {
    return ["--storyevents"];
  }

  else return [];
};

module.exports.toInfo = function(setting)
{
  if (setting == 0)
  {
    return `${name}: off`;
  }

  else if (setting == 1)
  {
    return `${name}: on`;
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
