
const config = require("../config.json");
const rw = require("../reader_writer.js");
const slaveServersModule = require("../slave_server.js");
const regexp = new RegExp(`^${config.prefix}CAPACITY`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "capacity";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Displays the combined amount of free slots for new games to be hosted across all servers.`;
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
  let capacity = 0;

  if (slaveServersModule.getLength() < 1)
  {
    message.channel.send(`Available slots: 0. There don't seem to be any servers online at the moment. Try again later.`);
    return;
  }

  slaveServersModule.forEach(function(server)
  {
    if (typeof server.capacity !== "number")
    {
      rw.logError({Server: server.name, capacity: server.capacity}, `Invalid server capacity.`);
      return;
    }

    capacity += server.getCurrentCapacity();
  });

  message.channel.send(`Available slots: ${capacity}.`);
}
