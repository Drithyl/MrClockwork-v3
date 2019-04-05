
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}SUBSCRIBE`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "subscribe";
};

module.exports.getCommandArguments = ["`[no argument to assign it to yourself, or any number of user mentions]`"];

module.exports.getHelpText = function()
{
  return `Adds the role that corresponds to the game hosted in the channel. Without arguments, it will add the role to yourself. With mentions (@ a user), it will assign it to other users. Example: \`${config.prefix}${module.exports.getReadableCommand()} @username1 @username2 @username3\``;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (regexp.test(command) === true && wasSentInGameChannel === true)
  {
    return true;
  }

  else
  {
    return false;
  }
};

module.exports.invoke = function(message, command, options)
{
  var membersMap = message.mentions.members;

  if (membersMap.size <= 0)
  {
    options.member.addRole(options.game.role);
    message.channel.send(`You assigned yourself the \`${options.game.role.name}\` role.`);
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
  {
    message.channel.send(`Only the game's organizer (${options.game.organizer.user.username}) or GMs can use this command to assign roles to others.`);
    return;
  }

  for (var [key, value] of membersMap)
  {
    value.addRole(options.game.role);
  }

  message.channel.send("The roles were added.");
};
