
const valueChecker = require("../../settings_value_checker.js");
const timer = require("../../timer.js");
const key = "currentTimer";
const name = "Current Timer";
const expectedType = "RegExp";
const expectedValue = new RegExp("^(\\d+|\\d+d(ay)?|\\d+h(our)?|\\d+m(inute)?)", "i");

module.exports.getKey = function()
{
  return key;
};

module.exports.getName = function()
{
  return name;
};

module.exports.toExeArguments = function(timer)
{
  if (timer.isPaused === true)
  {
    //random number of hours, will get changed below anyway. This is for blitzes to work with timers
    //because due to a bug, if no --hours command is passed then the game won't respond to timers
    return ["--hours", 0];
  }

  else
  {
    return timer.toExeArguments();
  }
};

module.exports.toInfo = function(timer)
{
  return `${name}: ${timer.print()}`;
};

module.exports.revive = function(data)
{
  return timer.reviveCurrent(data);
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  var timer = timer.createFromInput(input);

  if (timer == null)
  {
    rw.log("general", `validateTimer() Error: Incorrect input form. Input was: ${input}.`);
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  cb(null, Object.assign({}, timer));
}
