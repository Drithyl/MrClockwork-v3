
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}ROLLBACK`, "i");

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

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  //User typed command to start the reminder manager
  if (regexp.test(command) === true && wasSentInGameChannel === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  if (options.game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (options.game.gameType !== config.dom4GameTypeName && options.game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions games support this function.");
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

  if (options.game.getLocalCurrentTimer().turn < 2)
  {
    message.channel.send(`You can only rollback up to the first turn of the game.`);
    return;
  }

  rw.log("general", `${message.author.username} requested to rollback the game ${options.game.name}.`);
  message.channel.send(`Attempting a rollback...`);

  options.game.rollback(function(err)
  {
    if (err)
    {
      message.channel.send("An error occurred while trying to rollback the turn:\n\n" + JSON.stringify(err).toBox());
      return;
    }

    message.channel.send(`The game has been rollbacked to turn ${options.game.getLocalCurrentTimer().turn}. You'll have to reconnect to the game, as it had to be rebooted.`);

    //don't publish timer changes to news if it's a blitz; it's unnecessary spam
    if (options.game.isBlitz === false)
    {
      newsModule.post(`${message.author.username} rollbacked the game ${options.game.channel} to turn ${options.game.getLocalCurrentTimer().turn}.`, options.game.guild.id);
    }
  });
}
