
const config = require("../config.json");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}(DONATE)|(PATRE?ON)`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "patreon";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Sends a link to the patreon (https://www.patreon.com/MrClockwork). Thank you for your interest in contributing!`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (regexp.test(command) === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  message.channel.send(`If you are considering contributing to the project, you can read more information and do so here: https://www.patreon.com/MrClockwork. Thank you!`);
}
