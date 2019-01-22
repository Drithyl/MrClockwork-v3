
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
    message.channel.send(`You can only use this command within the channel of the game from which you wish to receive the turn file.`);
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

  if (game.wasStarted === false)
	{
		message.channel.send("The game hasn't been started yet.");
    return;
	}

  nationFilename = game.getNationFilenameFromPlayerID(message.author.id);

  if (nationFilename == null)
  {
    message.channel.send(`Could not find the nation that you are controlling.`);
    return;
  }

  //returns a buffer
  game.getNationTurnFile(nationFilename, function(err, buffer)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    options.member.send({files: [{attachment: buffer, name: `${game.name}_Turn_${game.getLocalCurrentTimer().turn}_${nationFilename}`}]}).catch(function(err)
    {
      rw.logError({User: message.author.username, Game: game.name}, `Error sending message with attachment: `, err);
      options.member.send(`Could not send the attachment.`);
    });
  });
};
