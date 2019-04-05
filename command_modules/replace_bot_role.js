
const config = require("../config.json");
const permissions = require("../permissions.js");
const guildModule = require("../guild_data.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}REPLACE`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "replace";
};

module.exports.getCommandArguments = ["`[the role ID or name from the ones the bot originally deployed that you want replaced]`", "`[the role ID or name of the new role to take its place]`"];

module.exports.getHelpText = function()
{
  return `Guild owner only. Replaces the given role that the bot originally deployed for the guild (i.e. Trusted) with an existing role within the guild, for better integration.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let data;
  let guild;
  let deployedRole;
  let guildRole;

  if (permissions.isGuildOwner(message.author.id, message.guild.id) === false)
  {
    message.channel.send(`Only the guild owner can use this command.`);
    return;
  }

  if (options.args[0] == null)
  {
    message.channel.send(`You must add the ID or name of the deployed role you want to replace, as well as the ID or name of the role that will take its place.`);
    return;
  }

  if (options.args[1] == null)
  {
    message.channel.send(`You must add the ID or name of the role that will take the place of the deployed role.`);
    return;
  }

  try
  {
    data = guildModule.getGuildData(message.guild.id);
    guild = guildModule.getGuildObject(message.guild.id);
    deployedRole = guild.roles.get(options.args[0]);
    guildRole = guild.roles.get(options.args[1]);

    //try to find by name if ID is not found
    if (deployedRole == null)
    {
      deployedRole = guild.roles.find(role => role.name === options.args[0]);
    }

    if (guildRole == null)
    {
      guildRole = guild.roles.find(role => role.name === options.args[1]);
    }

    if (deployedRole == null) throw `The deployed role ID or name is invalid.`;
    if (guildRole == null) throw `The replacing role ID or name is invalid.`;
  }

  catch(err)
  {
    message.channel.send(err);
    return;
  }

  for (var name in data.roles)
  {
    if (data.roles[name] === deployedRole.id)
    {
      data.roles[name] = guildRole.id;

      guildModule.save((err) =>
      {
        if (err)
        {
          data.roles[name] = deployedRole.id;
          rw.log(`error`, `There was an error replacing the role ${deployedRole.name} (id ${deployedRole.id}) with the role ${guildRole.name} (id ${guildRole.id}). The data could not be saved: `, err);
          message.channel.send(`There was an error saving the guild data. The role could not be replaced.`);
          return;
        }

        deployedRole.delete().then(() =>
        {
          message.channel.send(`The role was replaced successfully.`);
        }).catch((err) =>
        {
          message.channel.send(`The role was replaced successfully but the old role could not be deleted.`);
        });
      });

      return;
    }
  }

  message.channel.send(`The role selected to be replaced is not a role deployed by the bot.`);
}
