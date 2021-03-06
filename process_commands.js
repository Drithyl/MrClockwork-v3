
const fs = require("fs");
const rw = require("./reader_writer.js");
const channelFunctions = require("./channel_functions.js");
var commandModules = [];

//gather all filenames of the command modules to require them
fs.readdirSync("./command_modules").forEach(function(filename)
{
  let extension = filename.slice(filename.lastIndexOf("."));

  if (extension === ".js")
  {
    let mod = require(`./command_modules/${filename}`);

    if (typeof mod.isInvoked !== "function")
    {
      rw.log("general", `${filename} contains no isInvoked() function.`);
    }

    else if (mod.enabled === false)
    {
      rw.log("general", `The command ${filename} is disabled.`);
    }

    else commandModules.push(mod);
  }
});

//loop through all command modules and invoke the one that returns a positive match with the command/args used
module.exports.tryCommand = function(message, command, args, games, member, isDirectMessage)
{
  var game = channelFunctions.getGameThroughChannel(message.channel.id, games);
  var wasSentInGameChannel = (game != null);

  commandModules.find(function(mod)
  {
    if (mod.isInvoked(message, command, args, isDirectMessage, wasSentInGameChannel, game) === true)
    {
      mod.invoke(message, command, {args: args, games: games, member: member, isDM: isDirectMessage, game: game});
      return mod;
    }
  });
};
