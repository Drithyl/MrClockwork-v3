
const valueChecker = require("../../settings_value_checker.js");

const key = "defaultAILevel";
const name = "Default AI Level";
const expectedType = "IntRange";
const expectedValue = [0, 6];
const cue = `**${name}:**\n\n0 = no going AI\n1 = easy\n2 = normal (default)\n3 = difficult\n4 = mighty\n5 = master\n6 = impossible`;

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
  if (setting == 0)
  {
    return ["--nonewai"];
  }

  else return ["--newailvl", setting];
};

module.exports.toInfo = function(setting)
{
  if (setting == 0)
  {
    return `${name}: players cannot go AI`;
  }

  else if (setting == 1)
  {
    return `${name}: easy`;
  }

  else if (setting == 2)
  {
    return `${name}: normal`;
  }

  else if (setting == 3)
  {
    return `${name}: difficult`;
  }

  else if (setting == 4)
  {
    return `${name}: mighty`;
  }

  else if (setting == 5)
  {
    return `${name}: master`;
  }

  else if (setting == 6)
  {
    return `${name}: impossible`;
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
