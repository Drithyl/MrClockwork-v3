
const config = require("./config.json");
const rw = require("./reader_writer.js");
const dom4nations = require("./dom4_nations.json");
const dom5nations = require("./dom5_nations.json");

//Load indexes to load each setting module in the proper order
const coe4SettingsIndex = require("./settings/coe4/index.js");
const dom4SettingsIndex = require("./settings/dom4/index.js");
const dom5SettingsIndex = require("./settings/dom5/index.js");
var coe4Settings = [];
var dom4Settings = [];
var dom5Settings = [];

coe4SettingsIndex.forEach(function(filename)
{
  coe4Settings.push(require(`./settings/coe4/${filename}`));
});

dom4SettingsIndex.forEach(function(filename)
{
  dom4Settings.push(require(`./settings/dom4/${filename}`));
});

dom5SettingsIndex.forEach(function(filename)
{
  dom5Settings.push(require(`./settings/dom5/${filename}`));
});

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

  coe4Settings.forEach(function(mod)
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
  let str = `Name: ${game.name}\nIP: ${game.server.ip}\nPort: ${game.port}\nType: ${game.gameType}\nServer: ${game.server.name}\nOrganizer: ${game.organizer.user.username}\nGuild: ${game.guild.name}\n`;

  dom4Settings.forEach(function(mod)
  {
    let key = mod.getKey();

    if (game.settings[key] != null)
    {
      str += `${mod.toInfo(game.settings[key])}\n`;
    }
  });

  return str;
}

function translateDom5Info(game)
{
  let str = `Name: ${game.name}\nIP: ${game.server.ip}\nPort: ${game.port}\nType: ${game.gameType}\nServer: ${game.server.name}\nOrganizer: ${game.organizer.user.username}\nGuild: ${game.guild.name}\n`;

  dom5Settings.forEach(function(mod)
  {
    let key = mod.getKey();

    if (game.settings[key] != null)
    {
      str += `${mod.toInfo(game.settings[key])}\n`;
    }
  });

  return str;
}

function coe4SettingsToExeArguments(settings)
{
  var args = [];

  coe4Settings.forEach(function(mod)
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

  dom4Settings.forEach(function(mod)
  {
    let key = mod.getKey();

    //timers will be handled separately within the game intance itself
    if (settings[key] != null && /^(defaulttimer)|(currenttimer)/i.test(key) === false)
    {
      if (/^level(1|2|3)thrones/i.test(key) === true)
      {
        thrones.push(mod.toExeArguments(settings[key]));
      }

      else args = args.concat(mod.toExeArguments(settings[key]));
    }
  });

  return args = args.concat(thrones);
}

function dom5SettingsToExeArguments(settings)
{
  var args = [];
  var thrones = ["--thrones"];

  dom5Settings.forEach(function(mod)
  {
    let key = mod.getKey();

    //timers will be handled separately within the game intance itself
    if (settings[key] != null && /^(defaulttimer)|(currenttimer)/i.test(key) === false)
    {
      if (/^level(1|2|3)thrones/i.test(key) === true)
      {
        thrones.push(mod.toExeArguments(settings[key]));
      }

      else
      {
        args = args.concat(mod.toExeArguments(settings[key]));
      }
    }
  });

  return args.concat(thrones);
}
