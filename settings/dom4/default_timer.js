
const valueChecker = require("../../settings_value_checker.js");
const timer = require("../../timer.js");

const key = "defaultTimer";
const name = "Default Timer";
const expectedType = "RegExp";
const expectedValue = new RegExp("^(\\d+|\\d+d(ay)?|\\d+h(our)?|\\d+m(inute)?)", "i");
const cue = `**${name}:** Use the following format: 1d12h30m, where d are the days, h the hours and m the minutes. If you type only an integer, like '32', it will be interpreted as hours.`;

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
  if (setting.isPaused === true)
  {
    //random number of hours, will get changed below anyway. This is for blitzes to work with timers
    //because due to a bug, if no --hours command is passed then the game won't respond to timers
    return ["--hours", 0];
  }

  else
  {
    return setting.toExeArguments();
  }
};

module.exports.toInfo = function(setting)
{
  return `${name}: ${setting.print()}`;
};

module.exports.revive = function(data)
{
  return timer.revive(data);
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  var dTimer = timer.createFromInput(input);

  if (dTimer == null)
  {
    rw.log(null, `validateTimer() Error: Incorrect input form. Input was: ${input}.`);
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  cb(null, Object.assign({}, dTimer));
}
