
const valueChecker = require("../../settings_value_checker.js");

const key = "research";
const name = "Research";
const expectedType = "IntRange";
const expectedValue = [0, 4];
const cue = `**${name}:**\n\n0 = very easy\n1 = easy\n2 = normal\n3 = hard\n4 = very hard`;

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
  return ["--research", setting];
};

module.exports.toInfo = function(setting)
{
  if (setting == 0)
  {
    return `${name}: very easy`;
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
    return `${name}: hard`;
  }

  else if (setting == 4)
  {
    return `${name}: very hard`;
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
