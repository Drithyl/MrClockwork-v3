
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const timer = require("../timer.js");
const regexp = new RegExp("^DTIMER", "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "dtimer";
};

module.exports.getCommandArguments = ["`3d20h30m`, with your own numbers, or a single integer for hours (`0` to pause)."];

module.exports.getHelpText = function()
{
  return `Used to check (when used without arguments) or change the default turn timer (i.e. the timer that every new turn will default to). Can take a combination of days/hours/minutes, or a single number for hours. Can only be used by the organizer.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);

  if (game == null)
  {
    message.channel.send("The game is not in my list of saved games.");
    return;
  }

  if (game.gameType !== config.dom4GameTypeName && game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions games support this function.");
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (game.isOnline == null)
	{
		message.channel.send("There is no instance of this game online. It might be in the process of a timer change if someone else just used the command, in which case you'll need to wait a few seconds.");
    return;
	}

	if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer) === false)
	{
		message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer}) or GMs can do this.`);
    return;
	}

	if (game.wasStarted === false)
	{
		message.channel.send("The game hasn't been started yet.");
    return;
	}

  if (options.args.length < 1)
  {
    message.channel.send(`The default timer for this game is ${game.getLocalDefaultTimer().print()}.`);
    return;
  }

  changeDefaultTimer(message, options.args, game);
}

function changeDefaultTimer(message, args, game)
{
  var newTimer = timer.createFromInput(args[0]);

  rw.log(null, `${message.author.username} requested a default timer change: ${message.content}.`);

  game.changeDefaultTimer(newTimer, function(err)
  {
    if (err)
    {
      message.channel.send(`An error occurred while trying to change the default timer.`);
    }

    else if (newTimer.isPaused === true)
    {
      rw.log(null, `The default timer was set to zero (unlimited turn times).`);
      message.channel.send(`${channelFunctions.mentionRole(game.role)} The default timer has been paused.`);
    }

    else
    {
      rw.log(null, `The default timer was changed: ${message.content}.`);
      message.channel.send(`${channelFunctions.mentionRole(game.role)} The default timer has been set to ${newTimer.print()}.`);
    }
  });
}
