
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}START`, "i");
const forceRegexp = new RegExp(`^FORCE`, "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "start";
};

module.exports.getCommandArguments = [`\`force\`, use only if the game crashed due to a start error and the bot does not allow it to be started again`];

module.exports.getHelpText = function()
{
  return `Starts the game hosted in the channel. It will take 60 seconds for it to start generating the map and nation starts (so if you want to cancel it, you can kill the server task with the kill command before that time).`;
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

  if (options.game.isOnline == null)
	{
		message.channel.send("There is no instance of this game online. It might be in the process of a timer change if someone else used the command, in which case you'll need to wait a few seconds.");
    return;
	}

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${options.game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  if (options.game.wasStarted === true && forceRegexp.test(options.args[0]) === false)
  {
    message.channel.send(`The game was already started.`);
    return;
  }

  rw.log("general", `${message.author.username} requested to start the game ${options.game.name}.`);

  options.game.start(function(err)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    rw.log("general", `The game ${options.game.name} is starting.`);
    message.channel.send("The game will start the map and nation generation process in 60 seconds.");

    channelFunctions.moveGameToStartedCategory(options.game, function(err)
    {
      if (err)
      {
        message.channel.send(`Could not move this channel to the ${config.gameCategoryName} category; someone with privileges should do it manually.`);
      }

      rw.log("general", `Moved the game ${options.game.name} to the ${config.gameCategoryName} category.`);
    });
  });
};
