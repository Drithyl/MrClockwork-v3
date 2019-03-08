
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}INFO`, "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "info";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Sends useful game information, like the settings and the IP/port (this one only if you're a player in it).`;
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
  var ipAndPort = "";
  var info = `${options.game.printSettings().toBox()}`;

  if (options.member.roles.has(options.game.role.id) === true || permissions.equalOrHigher("gamemaster", options.member, message.guild.id) === true)
  {
    ipAndPort = `The IP for ${options.game.name} is ${options.game.ip}. The port is ${options.game.port}.\n\n`;
  }

  message.author.send(ipAndPort + info);
};
