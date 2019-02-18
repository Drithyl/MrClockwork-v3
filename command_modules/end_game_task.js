
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}KILL`, "i");
const nukeRegexp = new RegExp(`^${config.prefix}NUKE`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "kill";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Kills the process of the game hosted in the channel. This does not delete any data or saved files; it merely shuts down the dominions server. A regular user probably won't make use of this command, but it is useful if there is ever a need to reboot the game's process.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true || nukeRegexp.test(command) === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var game;

  if (options.isDM === true && regexp.test(command) === true)
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

  if (nukeRegexp.test(command) === true)
  {
    nukeGameTask(message, game);
    rw.log(null, `${message.author.username} requested to nuke ${game.name}.`);
    return;
  }

  rw.log(null, `${message.author.username} requested to kill ${game.name}.`);
  endGameTask(message, options, game);
};

function endGameTask(message, options, game)
{
  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
  }

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

function nukeGameTask(message, game)
{
  if (permissions.isServerOwner(message.author.id) === false)
  {
    message.channel.send(`Only Gods can wield such power.`);
    return;
  }

  game.server.socket.emit("nuke", {name: game.name, port: game.port}, function(err)
  {
    if (err)
    {
      message.author.send(`An error occurred when nuking this game. Check the logs.`);
      return;
    }

    message.channel.send(`Game has hopefully been nuked.`);
  });
}

//admin command
function endAllGameTasks(message, games)
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
