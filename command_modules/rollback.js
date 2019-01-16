
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp("^ROLLBACK", "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "rollback";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Rollbacks the game to the turn before the current one. This command cannot easily be reverted, and should usually be used under the unanymous agreement of players. Additionally, it's good practice to warn everyone once this command is used, so that they have a chance to review their turns (although backups are made every minute, so most turns should be at their last stage before the game originally changed turn).`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  //User typed command to start the reminder manager
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
    message.channel.send(`You can only use this command within the channel of the game for which you wish to manage your reminders.`);
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (game.gameType !== config.dom4GameTypeName && game.gameType !== config.dom4GameTypeName)
  {
    message.channel.send("Only Dominions games support this function.");
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

  if (game.getLocalCurrentTimer().turn < 2)
  {
    message.channel.send(`You can only rollback up to the first turn of the game.`);
    return;
  }

  game.rollback(function(err)
  {
    if (err)
    {
      message.channel.send("An error occurred while trying to rollback the turn:\n\n" + JSON.stringify(err).toBox());
    }

    else message.channel.send(`The game has been rollbacked to turn ${game.getLocalCurrentTimer().turn}. You'll have to reconnect to the game, as it had to be rebooted.`);
  });
}
