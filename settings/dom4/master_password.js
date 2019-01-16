
const valueChecker = require("../../settings_value_checker.js");

const key = "masterPassword";
const name = "Master Password";
const expectedType = "RegExp";
const expectedValue = new RegExp("[ !@#$%^&*()+\\-=\\[\\]{};':\"\\\\|,.<>\/?]", "i");
const cue = `**${name}:** must not contain spaces or special characters other than underscores.`;

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
  return ["--masterpass", setting];
};

module.exports.toInfo = function(setting)
{
  return `${name}: ${setting}`;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  //found illegal characters in the password
  if (valueChecker.check(input, expectedValue, expectedType) === true)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  if (input.length > 40)
	{
    cb(`Password ${input} is too long. Dominions allows for a maximum of 40 characters.`);
    return;
  }

  cb(null, input);
}
