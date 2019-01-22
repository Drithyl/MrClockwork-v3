
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const scoregraphs = require("../settings/dom5/scoregraphs.js");
const regexp = new RegExp(`^${config.prefix}SCORE`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getReadableCommand = function()
{
  return "score";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Sends the scoregraph numbers for the current turn in the form of an html file (opened with any browser). Only works if the scoregraph setting of the game is on or if the game has finished.`;
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
    message.channel.send(`You can only use this command within the channel of the game for which you wish to see the scoregraphs.`);
    return;
  }

  if (game.gameType !== config.dom4GameTypeName)
  {
    message.channel.send("Only Dominions 5 games support this function.");
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

	if (permissions.equalOrHigher("trusted", options.member, message.guild.id, game.organizer.id) === false)
	{
		message.channel.send(`Sorry, you do not have the permissions to do this. Only this a trusted role can do this.`);
    return;
	}

	if (game.wasStarted === false)
	{
		message.channel.send("The game hasn't been started yet.");
    return;
	}

  //TODO: also check if it's the final turn of the game, in which case the scoregraphs setting doesn't matter
  if (scoregraphs.areScoregraphsOn(game.settings[scoregraphs.getKey()]) === false)
  {
    message.channel.send(`You can only check the scores if the scoregraphs are on or if the game ended.`);
    return;
  }

  game.getScoreDump(function(err, buffer)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    message.channel.send({files: [{attachment: buffer, name: `${game.name}_Turn_${game.getLocalCurrentTimer().turn}.html`}]}).catch(function(err)
    {
      rw.logError({User: message.author.username}, `Error sending message with attachment: `, err)
      message.channel.send(`Could not send the attachment.`);
    });
  });
};
