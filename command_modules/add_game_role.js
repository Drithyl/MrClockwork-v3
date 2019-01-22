
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const hoster = require("../hoster.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}ADD\s*ROLE`, "i");

module.exports.enabled = false;

module.exports.getChannelRequiredToInvoke = "game";

//TODO: find a one-word command, as two words won't work.
module.exports.getReadableCommand = function()
{
  return "add role";
};

module.exports.getCommandArguments = ["`[any number of user mentions]`"];

module.exports.getHelpText = function()
{
  return `Adds the role that corresponds to the game hosted in the channel. It requires you to use a mention (@ a user) to indicate which user(s) must get the role. You may use multiple mentions in the same command. Example: \`${config.prefix}${module.exports.getReadableCommand()} @username1 @username2 @username3\``;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
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
  var game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);
  var membersMap = message.mentions.members;

  if (game == null)
  {
    message.channel.send(`Could not find the game for which you want to add roles.`);
    return;
  }

  if (membersMap.size <= 0)
  {
    message.channel.send("You did not mention any user. Use @ to mention the user to whom you want to give the role.");
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Only the game's organizer (${game.organizer.user.username}) or GMs can use this command.`);
    return;
  }

  for (var [key, value] of membersMap)
  {
    value.addRole(game.role);
  }

  message.channel.send("The role was added.");
};
