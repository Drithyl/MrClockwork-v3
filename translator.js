
const config = require("./config.json");
const rw = require("./reader_writer.js");
const dom4nations = require("./dom4_nations.json");
const dom5nations = require("./dom5_nations.json");
const settingsLoader = require("./settings/loader.js");
const dom4DefaultTimer = require("./settings/dom4/default_timer.js");
const dom4CurrentTimer = require("./settings/dom4/current_timer.js");
const dom5DefaultTimer = require("./settings/dom5/default_timer.js");
const dom5CurrentTimer = require("./settings/dom5/current_timer.js");

module.exports.dom4NationNameToFilename = function(name, era)
{
  var nationPool = dom4nations[era];
  var nationMatch = nationPool.find(function(nation)
  {
    if (nation.name.toLowerCase() === name.toLowerCase())
    {
      return nation;
    }
  });

  if (nationMatch != null && nationMatch.filename != null)
  {
    return nationMatch.filename;
  }

  else return null;
};

module.exports.dom4NationFilenameToName = function(filename, era)
{
  var nationPool = dom4nations[era];
  var nationMatch = nationPool.find(function(nation)
  {
    if (nation.filename === filename)
    {
      return nation;
    }
  });

  if (nationMatch != null && nationMatch.name != null)
  {
    return nationMatch.name;
  }

  else return filename;
};

module.exports.dom5NationNameToFilename = function(name, era)
{
  var nationPool = dom5nations[era];
  var nationMatch = nationPool.find(function(nation)
  {
    if (nation.name.toLowerCase() === name.toLowerCase())
    {
      return nation;
    }
  });

  if (nationMatch != null && nationMatch.filename != null)
  {
    return nationMatch.filename;
  }

  else return null;
};

module.exports.domNationList = function(game, era)
{
  var nationPool;
  var listString = "Name".width(40) + "Filename".width(25) + "Number\n\n";

  if (/(DOM4)|(DOMINIONS\s*4)/i.test(game) === true)
  {
    nationPool = dom4nations;
  }

  else if (/(DOM5)|(DOMINIONS\s*5)/i.test(game) === true)
  {
    nationPool = dom5nations;
  }

  else return null;

  if (nationPool[era] == null)
  {
    return null;
  }

  nationPool[era].forEach(function(nation)
  {
    listString += nation.fullName.width(40) + " " + nation.filename.width(25) + " " + nation.number + "\n";
  });

  return listString;
};

module.exports.translateGameInfo = function(game)
{
  if (game.gameType === config.coe4GameTypeName)
  {
    return translateCoE4Info(game);
  }

  else if (game.gameType === config.dom4GameTypeName)
  {
    return translateDom4Info(game);
  }

  else if (game.gameType === config.dom5GameTypeName)
  {
    return translateDom5Info(game);
  }

  else return "Incorrect gameType.";
};

module.exports.settingsToExeArguments = function(settings, gameType)
{
  if (gameType === config.coe4GameTypeName)
  {
    return coe4SettingsToExeArguments(settings)
  }

  else if (gameType === config.dom4GameTypeName)
  {
    return dom4SettingsToExeArguments(settings)
  }

  else if (gameType === config.dom5GameTypeName)
  {
    return dom5SettingsToExeArguments(settings)
  }

  else return null;
};

module.exports.getSeason = function(number)
{
  if (number === 0)
  {
    return "Summer";
  }

  else if (number === 1)
  {
    return "Autumn";
  }

  else if (number === 2)
  {
    return "Winter";
  }

  else if (number === 3)
  {
    return "Spring";
  }

  else return "";
};

function translateCoE4Info(game)
{
  let str = `Name: ${game.name}\nIP: ${game.server.ip}\nPort: ${game.port}\nType: ${game.gameType}\nServer: ${game.server.name}\nOrganizer: ${game.organizer.user.username}\nGuild: ${game.guild.name}\n`;

  settingsLoader.getAll(game.gameType).forEach(function(mod)
  {
    let key = mod.getKey();

    if (game.settings[key] != null)
    {
      str += `${mod.toInfo(game.settings[key])}\n`;
    }
  });

  return str;
}

function translateDom4Info(game)
{
  let str = `Name: ${game.name}\nType: ${game.gameType}\nServer: ${game.server.name}\nOrganizer: ${game.organizer.user.username}\nGuild: ${game.guild.name}\n`;

  settingsLoader.getAll(game.gameType).forEach(function(mod)
  {
    let key = mod.getKey();

    if (game.settings[key] != null && key !== "masterPassword")
    {
      str += `${mod.toInfo(game.settings[key])}\n`;
    }
  });

  return str;
}

function translateDom5Info(game)
{
  let str = `Name: ${game.name}\nType: ${game.gameType}\nServer: ${game.server.name}\nOrganizer: ${game.organizer.user.username}\nGuild: ${game.guild.name}\n`;

  settingsLoader.getAll(game.gameType).forEach(function(mod)
  {
    let key = mod.getKey();

    if (game.settings[key] != null && key !== "masterPassword")
    {
      str += `${mod.toInfo(game.settings[key], game)}\n`;
    }
  });

  return str;
}

function coe4SettingsToExeArguments(settings)
{
  var args = [];

  settingsLoader.getAll(config.coe4GameTypeName).forEach(function(mod)
  {
    let key = mod.getKey();

    if (settings[key] != null)
    {
      args = args.concat(mod.toExeArguments(settings[key]));
    }
  });

  return args;
}

function dom4SettingsToExeArguments(settings)
{
  var args = [];
  var thrones = ["--thrones"];

  settingsLoader.getAll(config.dom4GameTypeName).forEach(function(mod)
  {
    let key = mod.getKey();

    //timers will be handled separately within the game intance itself
    if (settings[key] != null && dom4CurrentTimer.getKey() !== key && dom4DefaultTimer.getKey() !== key)
    {
      if (/^level(1|2|3)thrones/i.test(key) === true)
      {
        thrones.push(mod.toExeArguments(settings[key]));
      }

      else args = args.concat(mod.toExeArguments(settings[key]));
    }
  });

  //no current timer, so use default
  if (settings[dom4CurrentTimer.getKey()] == null)
  {
    return args.concat(dom4DefaultTimer.toExeArguments(settings[dom4DefaultTimer.getKey()]), thrones);
  }

  else
  {
    return args.concat(dom4CurrentTimer.toExeArguments(settings[dom4CurrentTimer.getKey()]), thrones);
  }
}

function dom5SettingsToExeArguments(settings)
{
  var args = [];
  var thrones = ["--thrones"];

  settingsLoader.getAll(config.dom5GameTypeName).forEach(function(mod)
  {
    let key = mod.getKey();

    //timers will be handled separately within the game intance itself
    if (settings[key] != null && dom5CurrentTimer.getKey() !== key && dom5DefaultTimer.getKey() !== key)
    {
      if (/^level(1|2|3)thrones/i.test(key) === true)
      {
        thrones.push(mod.toExeArguments(settings[key]));
      }

      else args = args.concat(mod.toExeArguments(settings[key]));
    }
  });

  //no current timer, so use default
  if (settings[dom5CurrentTimer.getKey()] == null)
  {
    return args.concat(dom5DefaultTimer.toExeArguments(settings[dom5DefaultTimer.getKey()]), thrones);
  }

  else
  {
    return args.concat(dom5CurrentTimer.toExeArguments(settings[dom5CurrentTimer.getKey()]), thrones);
  }
}
