
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const timer = require("../timer.js");
const regexp = new RegExp("^TIMER", "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "timer";
};

module.exports.getCommandArguments = ["`3d20h30m`, with your own numbers, or a single integer for hours (`0` to pause), or no argument to check timer."];

module.exports.getHelpText = function()
{
  return `Used to check (when used without arguments) or to change the timer. Can take a combination of days/hours/minutes, or a single number for hours.`;
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

  if (game.gameType !== config.dom4GameTypeName && game.gameType !== config.dom4GameTypeName)
  {
    message.channel.send("Only Dominions games support this function.");
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (options.args.length < 1)
  {
    checkTimer(message, game);
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

  changeCurrentTimer(message, options.args, game);
}

function checkTimer(message, game)
{
  rw.log(null, `${message.author.username} requested to know the timer.`);

  game.getCurrentTimer(function(err, response)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    message.channel.send(response);
  });
}

function changeCurrentTimer(message, args, game)
{
  var newTimer = timer.createFromInput(args[0]);

  rw.log(null, `${message.author.username} requested a timer change: ${message.content}.`);

  game.changeCurrentTimer(newTimer, function(err)
  {
    if (err)
    {
      message.channel.send(`An error occurred while trying to change the current timer.`);
    }

    else if (newTimer.isPaused === true)
    {
      rw.log(null, `The timer was paused.`);
      message.channel.send(`${channelFunctions.mentionRole(game.role)} The timer has been paused. This might take a minute to update.`);
    }

    else
    {
      rw.log(null, `The timer was changed: ${message.content}.`);
      message.channel.send(`${channelFunctions.mentionRole(game.role)} The timer has been changed. Now ${newTimer.print()} remain for the new turn to arrive. This might take a minute to update.`);
    }
  });
}
