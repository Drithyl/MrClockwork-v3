
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}SUB`, `i`);
const pretendersModule = require("./get_submitted_pretenders.js")
var pretenderInput = pretendersModule.pretenderInput;
var pretendersCommand = `${config.prefix}${pretendersModule.getReadableCommand()}`;

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "sub";
};

module.exports.getCommandArguments = [`A number from the list obtained with the \`${pretendersCommand}\` command`, `A mention to the player who's to sub in`];

module.exports.getHelpText = function()
{
  return `Substitutes a pretender's player from the list received when using the \`${pretendersCommand}\` command, i.e. \`${config.prefix}${module.exports.getReadableCommand()} 1\`.`;
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
  var subMember = message.mentions.members.values().next().value;

  if (options.game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions 5 games support this function.");
    return;
  }

  if (options.game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (options.game.isBlitz === true)
  {
    message.channel.send(`Blitzes do not require pretenders to be claimed.`);
    return;
  }

  if (pretenderInput[options.game.name] == null || pretenderInput[options.game.name][message.author.id] == null)
  {
    message.channel.send(`You must use the \`${pretendersCommand}\` command first, to display the current pretenders submitted.`);
    return;
  }

  if (isNaN(+options.args[0]) === true || pretenderInput[options.game.name][message.author.id][+options.args[0]] == null)
  {
    message.channel.send(`You must specify the number of the nation that you wish to substitute. To see the nations submitted, use the \`${pretendersCommand}\` command.`);
    return;
  }

  if (pretenderInput[options.game.name] == null || pretenderInput[options.game.name][message.author.id] == null)
  {
    message.channel.send("Your input was lost. Please start over.");
    return;
  }

  if (isNaN(+options.args[0]) === true || Number.isInteger(+options.args[0]) === false)
  {
    message.channel.send("Select a number from the list.");
    return;
  }

  nation = pretendersModule.getSubmittedNation(options.game.name, message.author.id, +options.args[0]);

  if (nation == null)
  {
    message.channel.send(`Select a number from the list.`);
    return;
  }

  if (subMember == null)
  {
    message.channel.send(`You must mention (\`@username\`) the user that will sub for the nation in your command.`);
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false && options.game.isPretenderOwner(nation.filename, options.member.id) === false)
  {
    message.channel.send("Only a gameMaster or the player who submitted this nation can do designate a sub.");
    return;
  }

  rw.log("general", `${message.author.username} requested to sub the nation ${nation.filename} for the game ${options.game.name}. The designated sub is ${subMember.user.username}.`);

  options.game.subPretender(nation.filename, subMember, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      pretendersModule.deleteInput(options.game.name, message.author.id);
      return;
    }

    //remove the member's role if he is the pretender owner, as he is no longer in the game
    if (options.game.players[options.member.id] != null && options.game.players[options.member.id].nation.filename === nation.filename)
    {
      options.member.removeRole(options.game.role, `Designated ${subMember.user.username} as a sub.`);
    }

    subMember.addRole(options.game.role, `Was designated as a sub by ${options.member.user.username}.`);
    message.channel.send(`You have designated ${subMember.user.username} as the substitute for the nation ${nation.name}.`);
    subMember.send(`You have been designated as the substitute for the nation ${nation.name} in the game ${options.game.name} (in the channel ${options.game.channel.name}, from the guild ${options.game.guild.name}). If this has been done without your consent, please contact the game's organizer (${options.game.organizer.user.username}), a GM or an Admin.`);
    rw.log("general", `${subMember} has been designated as the substitute for the nation ${nation.name} in the game ${options.game.name} and guild ${options.game.guild.name}.`);
    pretendersModule.deleteInput(options.game.name, message.author.id);
  });
}
