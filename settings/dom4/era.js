
const valueChecker = require("../../settings_value_checker.js");

const key = "era";
const name = "Era";
const expectedType = "IntRange";
const expectedValue = [1, 3];
const cue = `**${name}:**\n\n1 = Early Age\n2 = Middle Age\n3 = Late Age`;

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
  return ["--era", setting];
};

module.exports.toInfo = function(setting)
{
  if (setting == 1)
  {
    return `${name}: Early Age`;
  }

  else if (setting == 2)
  {
    return `${name}: Middle Age`;
  }

  else if (setting == 3)
  {
    return `${name}: Late Age`;
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
