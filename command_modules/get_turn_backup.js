
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}BACKUP`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getReadableCommand = function()
{
  return "backup";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Sends the most recent turn backup for your nation in a game.`;
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
  if (options.game.gameType !== config.dom4GameTypeName)
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
		message.channel.send("The game hasn't been started yet.");
    return;
	}

  if (options.game.players[message.author.id].wentAI === true || options.game.players[message.author.id].subbedOutBy != null)
  {
    message.channel.send(`You cannot receive backups after you went AI or were subbed out of the game.`);
    return;
  }

  //returns a buffer
  options.game.getNationTurnFile(options.game.players[message.author.id].nation.filename, function(err, buffer)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    options.member.send({files: [{attachment: buffer, name: `${options.game.name}_Turn_${options.game.getLocalCurrentTimer().turn}_${nationFilename}`}]}).catch(function(err)
    {
      rw.log("error", true, `Error sending message with attachment: `, {User: message.author.username, Game: options.game.name}, err);
      options.member.send(`Could not send the attachment.`);
    });
  });
};
