
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}RESTART`, "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "restart";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Restarts the game hosted in the channel, which will go back to the pretender submission lobby (with no pretenders submitted). This command cannot be reverted easily, and should usually be used with the unanimous agreement of players.`;
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

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${options.game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  rw.log(null, `${message.author.username} requested to restart the game ${options.game.name}.`);

  options.game.restart(function(err)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    message.channel.send(`The game has been restarted. It should now be in the lobby, where everyone needs to resubmit their pretender.`);
    newsModule.post(`${message.author.username} restarted the game ${options.game.channel}.`, options.game.guild.id);
  });
};
