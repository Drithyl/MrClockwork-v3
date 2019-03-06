
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}LAUNCH`, "i");
const uiModeRegexp = new RegExp(`^(UI)|(FULL)`, "i");
const screenModeRegexp = new RegExp(`^(SCREEN)|(BA?C?KGRO?U?ND)`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "launch";
};

module.exports.getCommandArguments = ["`ui` or `screen/bkgrnd`(hosting server admin only)"];

module.exports.getHelpText = function()
{
  return `Launches the process of the game that's hosted in the current game channel, assuming it was offline. This command is normally not needed but is useful when rebooting a game's process.`;
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

  if (permissions.isServerOwner(message.author.id) === true && options.args[0] != null)
  {
    if (uiModeRegexp.test(options.args[0]) === true)
    {
      launchGameTask(message, game, {ui: true});
    }

    else if (screenModeRegexp.test(options.args[0]) === true)
    {
      launchGameTask(message, game, {screen: true});
    }
  }

  else launchGameTask(message, game);

  rw.log(null, `${message.author.username} requested to launch ${game.name}.`);
};

function launchGameTask(message, game, options)
{
  game.host(options, function(err)
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

function launchAllGameTasks(message, games)
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

    game = games[nameKeys.shift()];

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
