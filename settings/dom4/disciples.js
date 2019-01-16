
const valueChecker = require("../../settings_value_checker.js");

const key = "disciples";
const name = "Disciples";
const expectedType = "IntRange";
const expectedValue = [0, 2];
const cue = `**${name}:** (You will have to set up the teams yourself on the pretender lobby) (**WARNING:** if you are using a map with pre-defined nation starts for a disciples game, select 1, as clustered will mess the special starts)\n\n0 = off\n1 = on\n2 = on, with clustered starts`;

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
    return ["--teamgame"];
  }

  else if (setting == 2)
  {
    return ["--teamgame", "--clustered"];
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
    return `${name}: on (unclustered starts)`;
  }

  else if (setting == 2)
  {
    return `${name}: on (clustered starts)`;
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
