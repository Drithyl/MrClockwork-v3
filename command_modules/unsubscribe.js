
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const config = require("../config.json");
const regexp = new RegExp(`^${config.prefix}UNSUB(SCRIBE)?`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "unsubscribe";
};

module.exports.getCommandArguments = ["`[no argument to remove the role from yourself, or any number of user mentions]`"];

module.exports.getHelpText = function()
{
  return `Removes the role that corresponds to the game hosted in the channel. Without arguments, it will remove the role from yourself. With mentions (@ a user), it will remove it from other users. Example: \`${config.prefix}${module.exports.getReadableCommand()} @username1 @username2 @username3\``;
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
  var membersMap = message.mentions.members;

  if (membersMap.size <= 0)
  {
    options.member.removeRole(options.game.role);
    message.channel.send(`You removed the \`${options.game.role.name}\` role from yourself.`);
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
  {
    message.channel.send(`Only the game's organizer (${options.game.organizer.user.username}) or GMs can use this command to remove the role from others.`);
    return;
  }

  for (var [key, value] of membersMap)
  {
    value.removeRole(options.game.role);
  }

  message.channel.send("The roles were removed.");
};
