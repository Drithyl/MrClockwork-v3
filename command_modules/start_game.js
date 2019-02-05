
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}START`, "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "start";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Starts the game hosted in the channel. It will take 60 seconds for it to start (so if you want to cancel it, you can kill the server task with the kill command before that time).`;
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
		message.channel.send("There is no instance of this game online. It might be in the process of a timer change if someone else used the command, in which case you'll need to wait a few seconds.");
    return;
	}

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  if (game.wasStarted === true)
  {
    message.channel.send(`The game was already started.`);
    return;
  }

  rw.log(null, `${message.author.username} requested to start the game ${game.name}.`);

  game.start(function(err)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    rw.log(null, `The game ${game.name} is starting.`);
    message.channel.send("The game will start in 60 seconds.");

    channelFunctions.moveGameToStartedCategory(game, function(err)
    {
      if (err)
      {
        message.channel.send(`Could not move this channel to the ${config.gameCategoryName} category; someone with privileges should do it manually.`);
      }

      rw.log(null, `Moved the game ${game.name} to the ${config.gameCategoryName} category.`);
      newsModule.post(`${message.author.username} started the game ${game.name} (#${game.channel.name}).`, game.guild.id);
    });
  });
};
