
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}PIN`, "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "pin";
};

module.exports.getCommandArguments = [`a message to be pinned`];

module.exports.getHelpText = function()
{
  return `Lets an organizer pin a message to the game channel.`;
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
  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${options.game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  if (options.args[0] == null)
  {
    message.author.send(`You must add a message to pin right after the command.`);
    return;
  }

  rw.log("general", `${message.author.username} requested to pin a message to the ${options.game.name}'s channel.`);

  message.channel.send(options.args.join(" "))
  .then((msgToPin) =>
  {
    return msgToPin.pin();
  })
  .then((pinnedMsg) =>
  {
    message.delete();
  })
  .catch((err) => message.channel.send(`Error: ${err.message}`));
};
