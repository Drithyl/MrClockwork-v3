
const valueChecker = require("../../settings_value_checker.js");
const level1Thrones = require("./level_1_thrones.js");
const level2Thrones = require("./level_2_thrones.js");
const level3Thrones = require("./level_3_thrones.js");

const key = "ap";
const name = "Ascension Points";
const expectedType = "IntRange";
const expectedValue = [0, 80];
const cue = `**${name}:** the total must be equal or lower than the sum of the throne points chosen.`;

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
  return [`--requiredap`, setting];
};

module.exports.toExeArguments = function(setting)
{
  return ["--requiredap", setting];
};

module.exports.toInfo = function(setting)
{
  return `${name}: ${setting}`;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  let sum = validatedSettings[level1Thrones.getKey()] + (validatedSettings[level2Thrones.getKey()] * 2) + (validatedSettings[level3Thrones.getKey()] * 3);

  if (sum < +input)
  {
    rw.log("general", `validateAP() Error: Throne points must be equal or higher than Ascenscion Points. Input was: ${input}. Sum was: ${sum}.`);
    cb("The total amount of throne points must be equal or higher than the Ascenscion Points required.");
    return;
  }

  cb(null, +input);
}
