
const fs = require("fs");
const config = require("../config.json");
const rw = require("../reader_writer.js");
const guildModule = require("../guild_data.js");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const regexp = new RegExp(`^${config.prefix}UPDATE(_|\-)HELP`, "i");

module.exports.enabled = true;

module.exports.ignoreHelp = true;

module.exports.gameTypesSupported = [];

module.exports.getChannelRequiredToInvoke = "dm";

module.exports.getReadableCommand = function()
{
  return "update_help";
};

module.exports.getCommandArguments = ["`the ID of a guild that needs its help updated`, or nothing to update them all"];

module.exports.getHelpText = function()
{
  return `Re-writes the help information on the guild's help channel, to update it to the latest changes (i.e. new commands, changes in wordings, etc.). Admin only.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  //User typed command to start the preferences manager
  if (regexp.test(command) === true && isDirectMessage === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let channels;

  if (permissions.isServerOwner(message.author.id) === false)
	{
		message.channel.send(`Sorry, you do not have the permissions to do this. Only server owners can do this.`);
    return;
	}

  try
  {
    channels = (options.args[0] != null) ? [guildModule.getHelpChannel(options.args[0])] : guildModule.getHelpChannels();
  }

  catch(err)
  {
    message.channel.send(`The guild supplied does not seem to have a help channel.`);
    return;
  }

  if (channels == null || channels.length < 1)
  {
    message.channel.send(`No channel could be fetched.`);
    return;
  }

  //gather all of the command modules to access their help properties later
  fs.readdir(__dirname, function(err, filenames)
  {
    let cmdModules = [];
    let helpMessages;

    if (err)
    {
      throw err;
    }

    filenames.forEach(function(filename)
    {
      let extension = filename.slice(filename.lastIndexOf("."));

      if (extension === ".js")
      {
        let mod = require(`${__dirname}/${filename}`);

        if (mod.enabled === true && mod.ignoreHelp !== true)
        {
          cmdModules.push(mod);
        }
      }
    });

    helpMessages = composeNewHelpMessages(cmdModules);

    message.channel.send(`Updating help channel(s)...`);

    //loop through all fetched channels to delete their messages and then re-send them updated
    channels.forEachAsync((channel, index, next) =>
    {
      channel.fetchMessages().then((messages) =>
      {
        let i = 0;
        if (messages.size < 1)
        {
          helpMessages.forEach((helpMsg) =>
          {
            channel.send(helpMsg);
          });

          next();
        }

        else
        {
          for (var msg of messages.values())
          {
            msg.delete().then(() =>
            {
              if (++i >= messages.size)
              {
                //send new updated help
                helpMessages.forEach((helpMsg) =>
                {
                  channel.send(helpMsg);
                });

                next();
              }
            });
          }
        }

      });

    }, function finalCallback()
    {
      message.channel.send(`Help channels have been updated.`);
    });
  });
};

function composeNewHelpMessages(cmdModules)
{
  let intro = `Below are the commands available. Each one contains information about what it does and the arguments (sometimes optional, sometimes required) that make them work:\n\n`;

  //include intro first, then expand the result of all the operations, which are to
  //1. sort modules alphabetically by their command
  //2. construct the help message on that command based on several of its properties
  return [intro, ...cmdModules.sort((cmd1, cmd2) =>
  {
    if (cmd1.getReadableCommand() < cmd2.getReadableCommand()) { return -1; }
    if (cmd1.getReadableCommand() > cmd2.getReadableCommand()) { return 1; }
    return 0;

  }).map((cmd) =>
  {
    let str = `-------------------\n\n**${config.prefix}${cmd.getReadableCommand()}**\n${cmd.getHelpText()}\n\n\`Arguments:\`\n`;

    if (Array.isArray(cmd.getCommandArguments) === true && cmd.getCommandArguments.length > 0)
    {
      cmd.getCommandArguments.forEach(function(arg, i)
      {
        str += `${i+1}. ${arg}\n`;
      });
    }

    else str += "No arguments required.\n";

    return str;
  })];
}
