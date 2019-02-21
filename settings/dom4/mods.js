
const config = require("../../config.json");
const valueChecker = require("../../settings_value_checker.js");

const key = "mods";
const name = "Mods";
const expectedType = "RegExp";
const expectedValue = new RegExp("^(none)|((\\w+(.dm)?\\s*,?\\s*)+)", "i");
const cue = `**${name}:** Use \`%mods dom4 [chosen server name]\` (without brackets) to receive a list of the mods available in the server you chose. Type \`none\` for no mods, or type one or more mod filenames, separated by commas (,).`;

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
  let args = [];

  if (Array.isArray(setting) && setting.length)
  {
    for (var i = 0; i < setting.length; i++)
    {
      args.push("--enablemod", setting[i]);
    }

    return args;
  }

  else return ["--nomods"];
};

module.exports.toInfo = function(setting)
{
  let mods = "";

  if (typeof setting === "string")
  {
    return `${name}: ${setting}`;
  }

  for (var i = 0; i < setting.length; i++)
  {
    mods += setting[i];

    if (i < setting.length - 1)
    {
      mods += ", ";
    }
  }

  return `${name}: ${mods}`;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  if (input.toLowerCase().trim() === "none")
  {
    cb(null, "none");
    return;
  }

  var modList = input.toLowerCase().split(",");
  var finalMods = [];

  modList.forEachAsync(function(mod, index, next)
  {
    mod = mod.trim();

    //mod name is all whitespace
    if (/\S+/.test(mod) === false)
    {
      next();
      return;
    }

    if (/\.dm$/.test(mod) === false)
    {
      mod = mod + ".dm";
    }

    server.socket.emit("validateMod", {mod: mod, gameType: config.dom4GameTypeName}, function(err)
    {
      if (err)
      {
        cb(err);
        return;
      }

      finalMods.push(mod);
      next();
    });
  }, function callback(err)
  {
    if (err)
    {
      cb(err);
      return;
    }

    cb(null, finalMods);
  });
}
