
const config = require("../config.json");
const regexp = new RegExp(`^${config.prefix}GAMES`, "i");
const detailsRegexp = new RegExp(`^${config.prefix}VIEW`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "games";
};

module.exports.getCommandArguments = ["`[a channel name]`"];

module.exports.getHelpText = function()
{
  return `Displays the list of ongoing games in your guild by PM (Private Message). You can then type \`%view [game name]\` to see more details of a particular game, where [game name] must be replaced by that game's name.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  //User typed command to display games
  if (regexp.test(command) === true)
  {
    return true;
  }

  //User DMed the bot to view details of a particular game
  else if (detailsRegexp.test(command) === true && isDirectMessage === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  //sends game list
  if (regexp.test(command) === true)
  {
    //direct message, thus print all games
    if (message.guild != null)
    {
      message.author.send(printGuildGameList(options.games, message.guild).toBox());
    }

    else message.channel.send(printFullGameList(options.games).toBox());
  }

  //prints game details
  else
  {
    if (options.args[0] == null)
    {
      message.channel.send(`You must add a game name to the command to view its details.`);
      return;
    }

    if (options.games[options.args[0].toLowerCase()] == null)
    {
      message.channel.send(`This game does not exist. Make sure you spelled it correctly.`);
      return;
    }

    sendGameDetails(message, options.games[options.args[0].toLowerCase()]);
  }
};

function sendGameDetails(message, game)
{
  var info = `Port: ${game.port}\nGame type: ${game.gameType}\nTimer: ${game.getLocalCurrentTimer().shortPrint()}\nIs tracked?: `;

  if (game.tracked === true)
  {
    info += "yes";
  }

  else info += "no";

  info += `\nOrganizer:`;

  if (game.organizer == null)
  {
    info += "unknown\n";
  }

  else info += `${game.organizer.user.username}\n`;

  info += `Server: ${game.server.name}\nStatus: `;

  if (game.isOnline === true && game.isServerOnline === true)
  {
    info += "Online\n";
  }

  else if (game.isServerOnline === false)
  {
    info += "Server offline\n";
  }

  else info += "Offline\n";

  message.channel.send("**" + game.name + "**:\n" + info.toBox());
}

function printGuildGameList(games, guild)
{
  var gameList = "";
  var guildGames = [];
  var gameNames = Object.keys(games);

  if (gameNames.length < 1)
  {
    return `There are no games hosted on any server.`;
  }

  gameNames.filter(function(name)
  {
    if (games[name].guild.id === guild.id)
    {
      guildGames.push(games[name]);
    }
  });

  guildGames.forEach(function(game, index)
  {
    gameList += printBasicInfo(game, true) + "\n";
  });

  return gameList;
}

function printFullGameList(games)
{
  var gameList = "";
  var gameNames = Object.keys(games);

  if (gameNames.length < 1)
  {
    return `There are no games hosted on any server.`;
  }

  gameNames.forEach(function(name, index)
  {
    gameList += printBasicInfo(games[name]) + "\n";
  });

  return gameList;
}

function printBasicInfo(game, includeGuild = false)
{
  var info = game.name.width(33) + ("IP: " + game.ip + ".").width(20) + ("Port: " + game.port + ".").width(13);
  var currentTimer = game.getLocalCurrentTimer();

  if (game.wasStarted === false)
  {
     info += "Has not started.".width(18);
  }

  else
  {
    if (currentTimer.isPaused === true)
    {
      info += "Timer: " + (currentTimer.shortPrint() + ". ").width(15);
    }

    else info += "Timer: " + (currentTimer.shortPrint() + " left. ").width(15);
  }

  if (includeGuild === true && typeof game.guild === "object")
  {
    info += "Guild: " + game.guild.name.width(30);
  }

  info += "Status: ";

  if (game.isOnline === true && game.isServerOnline === true)
  {
    info += "Online.";
  }

  else if (game.isServerOnline === false)
  {
    info += "Server offline.";
  }

  else info += "Offline.";

  return info;
}
