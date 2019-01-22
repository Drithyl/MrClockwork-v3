
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}KILL`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "kill";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Kills the process of the game hosted in the channel. This does not delete any data or saved files; it merely shuts down the dominions server`;
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
    endAllGameTasks(message, options.games);
    return;
  }

  game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);

  if (game == null)
  {
    message.channel.send("The game is not in my list of saved games.");
    return;
  }

  if (game.isOnline === false)
  {
    message.channel.send("There is no instance online to be killed. To launch a game's instance, use `%launch <game name>`.");
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

  rw.log(null, `${message.author.username} requested to kill ${game.name}.`);
  endGameTask(message, game);
};

function endGameTask(message, game)
{
  game.kill(function(err)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    //inform the organizer if he's not the one that requested this.
    if (message.author.id !== game.organizer.id)
    {
      game.organizer.send(`${message.author.username} requested to kill ${game.name}'s task.'`);
    }

    message.channel.send(`${game.name}'s process has been killed.`);
    rw.log(null, `${game.name}'s process has been killed.`);
  });
}

//admin command
function endAllGamesTasks(message, games)
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

      else message.channel.send(`All games were killed successfully.`);
      return;
    }

    game = nameKeys.shift();

    game.kill(function(err)
    {
      if (err)
      {
        errors.push(`The game ${game.name} could not be killed: ${JSON.stringify(err)}`);
        loopGames();
      }

      else loopGames();
    });
  }
}
