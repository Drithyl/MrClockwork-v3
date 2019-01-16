
const valueChecker = require("../../settings_value_checker.js");

const key = "artifactForging";
const name = "Artifact Forging";
const expectedType = "IntRange";
const expectedValue = [0, 1];
const cue = `**${name}:**\n\n0 = players can only forge one artifact per turn (default)\n1 = players can forge more than one artifact per turn`;

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
    return "--noartrest";
  }

  else return [];
};

module.exports.toInfo = function(setting)
{
  if (setting == 1)
  {
    return `${name}: can forge more than one per turn`;
  }

  else return `${name}: can forge only one per turn`;
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
