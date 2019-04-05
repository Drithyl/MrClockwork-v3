
const fs = require("fs");
const config = require("../config.json");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}HELP`, `i`);
const detailsRegexp = new RegExp(`^${config.prefix}INFO`, "i");
var guildChannelCommands = [];
var gameChannelCommands = [];
var dmCommands = [];
var universalCommands = [];
var otherCommands = [];
var orderedCommands;
var getChannelRequiredToInvoke = "universal";

/****************
*   INIT CODE   *
*****************
****************/

//gather all filenames of the command modules to require them
var commandFilenames = fs.readdirSync("./command_modules").filter(function(filename)
{
  let extension = filename.slice(filename.lastIndexOf("."));

  //no need to include this module into the command list
  if (extension === ".js" && filename.toLowerCase() !== "help.js")
  {
    return filename;
  }
});

commandFilenames.forEach(function(filename)
{
  let mod = require(`../command_modules/${filename}`);

  if (mod == null)
  {
    throw `Module: ${filename}\nCaller: initializing code\nError: The command ${filename} does not have a module property.`;
  }

  else if (mod.getReadableCommand == null && typeof mod.getReadableCommand !== "function")
  {
    throw `Module: ${filename}\nCaller: initializing code\nError: The command ${filename} does not have the getReadableCommand property.`;
  }

  else if (typeof mod.getChannelRequiredToInvoke !== "string")
  {
    throw `Module: ${filename}\nCaller: initializing code\nError: The command ${filename}'s getChannelRequiredToInvoke property is invalid.`;
  }

  else if (mod.enabled === true && mod.ignoreHelp !== true)
  {
    switch(mod.getChannelRequiredToInvoke.toLowerCase())
    {
      case "guild":
      guildChannelCommands.push(mod);
      break;

      case "game":
      gameChannelCommands.push(mod);
      break;

      case "dm":
      dmCommands.push(mod);
      break;

      case "universal":
      universalCommands.push(mod);
      break;

      default:
      throw `Module: ${filename}\nCaller: initializing code\nError: The command ${filename}'s getChannelRequiredToInvoke property has an invalid value.`;
      break;
    }
  }
});

orderedCommands = guildChannelCommands.concat(gameChannelCommands, dmCommands, universalCommands);
helpMenu = composeHelpScreen();

/************************
*************************
*   END OF INIT CODE    *
************************/
module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "help";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Send a direct message with a list of the available commands.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true || (detailsRegexp.test(command) === true && isDirectMessage === true))
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let str = "";

  if (regexp.test(command) === true)
  {
    message.author.send(helpMenu);
  }

  else if (detailsRegexp.test(command) === true && options.isDM === true)
  {
    let index = +options.args[0];
    let commandModule = orderedCommands[index];

    if (isNaN(+index) === true || commandModule == null)
    {
      message.channel.send(`Please choose a number of the list shown above using the command \`${config.prefix}info [index]\`, where \`[index]\` is the number on the list.`);
      return;
    }

    if (typeof commandModule.getHelpText !== "function")
    {
      rw.log("error", `The command does not have a getHelpText() function.`, {User: message.author.username, Command: commandModule.getReadableCommand()});
      message.channel.send("This command lacks any additional information.");
      return;
    }

    str = `**Command:** \`${config.prefix}${commandModule.getReadableCommand()}\`\n**Arguments:\n**`;

    if (Array.isArray(commandModule.getCommandArguments) === true && commandModule.getCommandArguments.length > 0)
    {
      commandModule.getCommandArguments.forEach(function(arg, i)
      {
        str += `${i+1}. ${arg}\n`;
      });
    }

    else str += "No arguments required.\n";

    str += `\n**Description:** ${commandModule.getHelpText()}`;

    message.channel.send(str);
  }

  else
  {
    rw.log("error", `help command was invoked, but no regexp matches were found within invoke().`, {User: message.author.username, Command: command});
    message.channel.send(`An error occurred when processing your command.`);
  }
};

function composeHelpScreen()
{
  let index = 0;
  var str = `Here is the numbered list of all the basic commands available. For a description of one of them, type \`${config.prefix}info [index]\`, where \`[index]\` is the number on the list:\n\n`;
  str += `**Guild commands** (can be used in any channel within the guild):\n\n\`\`\``;

  guildChannelCommands.forEach(function(command, i)
  {
    if (command.ignoreHelp !== true)
    {
      str += (index + ".").width(4) + config.prefix + command.getReadableCommand() + "\n";
      index++;
    }
  });

  str += `\`\`\`\n\n**Game commands** (must be used within a game's channel, and they apply to that one game):\n\n\`\`\``;

  gameChannelCommands.forEach(function(command, i)
  {
    if (command.ignoreHelp !== true)
    {
      str += (index + ".").width(4) + config.prefix + command.getReadableCommand() + "\n";
      index++;
    }
  });

  str += `\`\`\`\n\n**DM commands** (must be used by private message here):\n\n\`\`\``;

  dmCommands.forEach(function(command, i)
  {
    if (command.ignoreHelp !== true)
    {
      str += (index + ".").width(4) + config.prefix + command.getReadableCommand() + "\n";
      index++;
    }
  });

  str += `\`\`\`\n\n**Universal commands** (can be used in any channel or by private message):\n\n\`\`\``;

  universalCommands.forEach(function(command, i)
  {
    if (command.ignoreHelp !== true)
    {
      str += (index + ".").width(4) + config.prefix + command.getReadableCommand() + "\n";
      index++;
    }
  });

  str += `\`\`\``;

  return str;
}
