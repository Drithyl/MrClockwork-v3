
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
  return `Displays the list of ongoing games in your guild by PM (Private Message). You can then type \`${config.prefix}view [game name]\` to see more details of a particular game, where [game name] must be replaced by that game's name.`;
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
    //guild message, thus print only those games
    if (message.guild != null)
    {
      message.author.send(printGuildGameList(options.games, message.guild).toBox(), {split: {prepend: "```", append: "```"}});
    }

    else message.channel.send(printFullGameList(options.games).toBox(), {split: {prepend: "```", append: "```"}});
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
  var info = `Port: ${game.port}\nGame type: ${game.gameType}\nTimer: ${game.getLocalCurrentTimer().shortPrint()}\nTracked: `;

  if (game.tracked === true)
  {
    info += "yes";
  }

  else info += "no";

  info += `\nOrganizer: `;

  if (game.organizer == null)
  {
    info += "unknown\n";
  }

  else info += `${game.organizer.user.username}\n`;

  info += "Guild: ";

  if (game.guild == null)
  {
    info += "unknown\n";
  }

  else info += `${game.guild.name}\n`;

  info += `Server: `;

  if (game.isServerOnline === true)
  {
    info += `${game.server.name}\n`;
  }

  else info += "Offline\n";

  info += "Status: ";

  if (game.isOnline === true && game.isServerOnline === true)
  {
    info += "Online\n";
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
     info += "Timer: Has not started.".width(30);
  }

  else
  {
    if (currentTimer.isPaused === true)
    {
      info += ("Timer: " + currentTimer.shortPrint() + ". ").width(30);
    }

    else info += ("Timer: " + currentTimer.shortPrint() + " left. ").width(30);
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
