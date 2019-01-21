
const config = require("../../config.json");
const valueChecker = require("../../settings_value_checker.js");

const key = "map";
const name = "Map";
const expectedType = "RegExp";
const expectedValue = new RegExp("^(random\\s*(10|15|20|25))|(\\w+(.map)?)", "i");
const mapfileInputInfo = "Type the filename of the map that you wish to use.";
const randomMapInputInfo = "Type `random X` for a random map with X provinces per player, where X can be 10, 15, 20 or 25.";
const cue = `**${name}:** Use \`%maps dom5\` to receive a list of the available maps. You can respond one of the following:\n\n\t${mapfileInputInfo}\n\t${randomMapInputInfo}`;

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
  if (setting.includes(".map") === false)
  {
    return ["--randmap", setting.replace(/\D+/g, ""), "--vwrap"];
  }

  else return ["--mapfile", setting];
};

module.exports.toInfo = function(setting)
{
  if (setting.includes(".map") === false)
  {
    return `${name}: random (${setting.replace(/\D+/g, "")} provinces/player)`;
  }

  else return `${name}: ${setting}`;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  console.log("validating mapfile. Input is: " + input);
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    console.log("Invalid");
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  //test if the input is "random" to generate a random map
  if (/^random/i.test(input) === true)
  {
  	cb(null, input.toLowerCase());
    return;
  }

  //add the .map extension if the input doesn't contain it
  if (/\.map$/i.test(input.trim()) === false)
  {
    input += ".map";
  }

  console.log("Emitting to validate mapfile slave side");
  server.socket.emit("validateMap", {mapfile: input, gameType: config.dom5GameTypeName}, function(err, map)
  {
    if (err)
    {
      console.log("slave error");
      cb(err);
    }

    else cb(null, map);
    console.log("validated");
  });
}
