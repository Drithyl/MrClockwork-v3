
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}LAUNCH`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "launch";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Launches the process of the game that's hosted in the current game channel, assuming it was offline.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var game;

  if (options.isDM === true)
  {
    launchAllGameTasks(message, options.games);
    return;
  }

  game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);

  if (game == null)
  {
    message.channel.send("The game is not in my list of saved games.");
    return;
  }

  if (game.isOnline === true)
  {
    message.channel.send("This game's instance is already online.");
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  rw.log(null, `${message.author.username} requested to launch ${game.name}.`);
  launchGameTask(message, game);
};

function launchGameTask(message, game)
{
  game.host(null, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    rw.log(null, `${game.name}'s process has been launched.`);
    message.channel.send(`${game.name}'s process has been launched.`);
  });
}

function launchAllGamesTasks(message, games)
{
  var errors = [];
  var nameKeys = Object.keys(games);

  if (permissions.isMasterOwner(message.author.id) === false)
  {
    return;
  }

  loopGames();

  function loopGames()
  {
    var game;

    if (nameKeys.length < 1)
    {
      if (errors.length > 0)
      {
        message.channel.send(`The following errors occurred:\n\n${errors.listStrings().toBox()}`);
      }

      else message.channel.send(`All games were hosted successfully.`);
      return;
    }

    game = nameKeys.shift();

    game.host(null, function(err)
    {
      if (err)
      {
        errors.push(`The game ${game.name} could not be hosted: ${JSON.stringify(err)}`);
        loopGames();
      }

      else loopGames();
    });
  }
}
