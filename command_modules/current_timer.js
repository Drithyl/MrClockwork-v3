
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const timer = require("../timer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}TIMER`, "i");

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
  return `Used to check (when used without arguments) or to change the timer. Can take a combination of days/hours/minutes, or a single number for hours. Can only be used by the organizer.`;
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
  if (options.game.gameType !== config.dom4GameTypeName && options.game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions games support this function.");
    return;
  }

  if (options.game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (options.args.length < 1)
  {
    checkTimer(message, options.game);
    return;
  }

  if (options.game.isOnline == null)
	{
		message.channel.send("There is no instance of this game online. It might be in the process of a timer change if someone else just used the command, in which case you'll need to wait a few seconds.");
    return;
	}

	if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
	{
		message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${options.game.organizer.user.username}) or GMs can do this.`);
    return;
	}

	if (options.game.wasStarted === false)
	{
		message.channel.send("The game hasn't been started yet.");
    return;
	}

  changeCurrentTimer(message, options.args, options.game);
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
      newsModule.post(`${message.author.username} paused ${game.channel}'s timer.`, game.guild.id);
    }

    else
    {
      rw.log(null, `The timer was changed: ${message.content}.`);
      message.channel.send(`${channelFunctions.mentionRole(game.role)} The timer has been changed. Now ${newTimer.print()} remain for the new turn to arrive. This might take a minute to update.`);
      newsModule.post(`${message.author.username} changed ${game.channel}'s timer. Now ${newTimer.print()} remain for the new turn to arrive.`, game.guild.id);
    }
  });
}
