
const config = require("../config.json");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const guildModule = require("../guild_data.js");
const emitter = require("../emitter.js");
const regexp = new RegExp("^READY", "i");
const activeMemberMaps = {};

//30 minutes in ms
const maxInactiveTime = 18000;

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "ready";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Gives you the blitzer role, which grants access to the general blitz channel of the guild. If you spend more than ${maxInactiveTime / 60000} minutes inactive, the role will be removed and you will have to use this command again. If you still have the role, using the same command again will remove it.`;
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
  var blitzerRole;

  try
  {
    blitzerRole = guildModule.getBlitzerRole(message.guild.id);
  }

  //err traced in the getBlitzerRole() function
  catch(err)
  {
    message.channel.send(`An error occurred; could not fetch the blitzer role for this guild.`);
    return;
  }

  if (options.member.roles.has(blitzerRole.id) === true)
  {
    options.member.removeRole(blitzerRole);
    removeActiveMember(message.guild.id, options.member);
    message.channel.send(`You are no longer ready to blitz. You won't have access to the ${config.blitzGeneralChannelName} channel.`);
  }

  else
  {
    options.member.addRole(blitzerRole);
    addActiveMember(message.guild.id, options.member);
    message.channel.send(`You are now ready to blitz. You now have access to the ${config.blitzGeneralChannelName} channel. Type \`ready\` again to remove this. If you spend more than ${maxInactiveTime / 60000} minutes inactive, the role will be removed and you will have to use this command again.`);
  }
};

//the member sent a message in a guild, check if his permissions to have
//the blitzer role need renewing
emitter.on("guildMessage", (data) =>
{
  var blitzerRole;

  try
  {
    blitzerRole = guildModule.getBlitzerRole(data.guild.id);
  }

  //err traced in the getBlitzerRole() function
  catch(err)
  {
    return;
  }

  if (data.member.roles.has(blitzerRole.id) === true)
  {
    //perhaps user got the role manually, so check and either remove him from active users or timestamp him
    if (data.member.lastMessage != null && Date.now() - data.member.lastMessage.createdTimestamp > maxInactiveTime)
    {
      removeActiveMember(data.guild.id, data.member);
    }

    else addActiveMember(data.guild.id, data.member);
  }
});

//Check for blitz permissions every minute
emitter.on("minute", () =>
{
  for (var guildID in activeMemberMaps)
  {
    for ([member, timestamp] of activeMemberMaps[guildID])
    {
      console.log(`cycling through ${member.user.username}`);
      //max inactive time reached, remove member from the active members
      if (Date.now() - timestamp > maxInactiveTime)
      {
        console.log("inactive, removing role");
        removeActiveMember(guildID, member);
      }

      else console.log("still active");
    }
  }
});

function removeActiveMember(guildID, member)
{
  var blitzerRole;

  try
  {
    blitzerRole = guildModule.getBlitzerRole(guildID);
  }

  //err traced in the getBlitzerRole() function
  catch(err)
  {
    return;
  }

  if (member.roles.has(blitzerRole.id) === true)
  {
    member.removeRole(blitzerRole);
  }

  //remove the member
  activeMemberMaps[guildID].delete(member);
}

//timestamp the moment in which the member becomes a blitzer;
//it will be used to remove his role if he spends too long without
//sending any messages in the guild
function addActiveMember(guildID, member)
{
  if (activeMemberMaps[guildID] == null)
  {
    activeMemberMaps[guildID] = new Map();
  }

  activeMemberMaps[guildID].set(member, Date.now());
}
