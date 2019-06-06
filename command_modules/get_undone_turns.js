
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}(UNPLAYED)|(UNDONE)`, `i`);

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "undone";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Displays a list of the turns that are completely undone (will not display those marked as unfinished).`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (regexp.test(command) === true && wasSentInGameChannel === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  if (options.game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions 5 games support this function.");
    return;
  }

  if (options.game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (options.game.wasStarted === false)
  {
    message.channel.send("The game hasn't started yet.");
    return;
  }

  sendUndoneTurns(options.game);
}

function sendUndoneTurns(game)
{
  var undoneCount = 0;
  var unfinishedCount = 0;
  var undoneNations = "";
  var unfinishedNations = "";

  game.getStatusDump(function(err, dump)
  {
    if (err)
    {
      game.channel.send(`An error occurred. Could not retrieve the turn information.`);
      return;
    }

    for (var nation in dump)
    {
      if (dump[nation].controller != 1)
      {
        continue;
      }

      if (dump[nation].turnPlayed == 0)
      {
        undoneCount++;
        undoneNations += "- " + dump[nation].nationFullName + "\n";
      }

      else if (dump[nation].turnPlayed == 1)
      {
        unfinishedCount++;
        unfinishedNations += "- " + dump[nation].nationFullName + "\n";
      }
    }

    if (undoneCount > 0)
    {
      game.channel.send(`Undone turns:\n\n${undoneNations.toBox()}`);
    }

    if (unfinishedCount > 0)
    {
      game.channel.send(`Unfinished turns:\n\n${unfinishedNations.toBox()}`);
    }

    if (undoneCount === 0 && unfinishedCount === 0)
    {
      game.channel.send(`All of the turns are done. Turn should probably be processing right now (or something else is wrong).`);
    }
  });
}
