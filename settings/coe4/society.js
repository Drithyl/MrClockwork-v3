
const valueChecker = require("../../settings_value_checker.js");

const key = "society";
const name = "Society";
const expectedType = "IntRange";
const expectedValue = [0, 6];
const cue = `**${name}:**\n\n0 = Random\n1 = Dark Ages\n2 = Agricultural\n3 = Empire\n4 = Fallen Empire\n5 = Monarchy\n6 = Dawn of a New Empire`;

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
  return ["--society=", setting];
};

module.exports.toInfo = function(setting)
{
  if (setting == 0)
  {
    return `${name}: Random`;
  }

  else if (setting == 1)
  {
    return `${name}: Dark Ages`;
  }
  else if (setting == 2)
  {
    return `${name}: Agricultural`;
  }
  else if (setting == 3)
  {
    return `${name}: Empire`;
  }
  else if (setting == 4)
  {
    return `${name}: Fallen Empire`;
  }
  else if (setting == 5)
  {
    return `${name}: Monarchy`;
  }
  else if (setting == 6)
  {
    return `${name}: Dawn of a New Empire`;
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
