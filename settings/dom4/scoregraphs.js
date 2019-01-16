
const valueChecker = require("../../settings_value_checker.js");

const key = "scoregraphs";
const name = "Scoregraphs";
const expectedType = "IntRange";
const expectedValue = [0, 2];
const cue = `**${name}:**\n\n0 = disabled (will remove any information on other nations, even through sites)\n1 = off\n2 = on`;

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

module.exports.toInfo = function(setting)
{
  if (setting == 0)
  {
    return `${name}: disabled (no nation info at all)`;
  }

  else if (setting == 1)
  {
    return `${name}: off (can get info from spells and sites)`;
  }

  else if (setting == 2)
  {
    return `${name}: on`;
  }

  else return `${name}: incorrect value`;
};

module.exports.toExeArguments = function(setting)
{
  if (setting == 0)
  {
    return ["--nonationinfo"];
  }

  else if (setting == 2)
  {
    return ["--scoregraphs"];
  }

  else return [];
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
