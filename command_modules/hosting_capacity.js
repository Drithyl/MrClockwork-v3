
const config = require("../config.json");
const rw = require("../reader_writer.js");
const slaveServersModule = require("../slave_server.js");
const regexp = new RegExp(`^${config.prefix}((CAPACITY)|(SERVERS))`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "capacity";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Displays the current amount of free slots for new games in each online server.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  //User typed command to display games
  if (regexp.test(command) === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  if (slaveServersModule.getLength() < 1)
  {
    message.channel.send(`There don't seem to be any servers online at the moment. Try again later.`);
    return;
  }

  message.channel.send(`Available servers:\n\n\`\`\`${slaveServersModule.getList()}\`\`\``);
}
