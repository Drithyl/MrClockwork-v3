
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const listRegexp = new RegExp(`^${config.prefix}PRETENDER`, `i`);
const claimRegexp = new RegExp(`^${config.prefix}CLAIM`, `i`);
const subRegexp = new RegExp(`^${config.prefix}SUB`, `i`);
const removeRegexp = new RegExp(`^${config.prefix}REMOVE`, `i`);
var pretenderInput = {};

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "pretenders";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Displays a list of submitted pretenders in the game hosted in the channel. You can then claim a pretender, remove it or designate a substitute for it.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if ((listRegexp.test(command) === true ||
       subRegexp.test(command) === true ||
       claimRegexp.test(command) === true ||
       removeRegexp.test(command) === true) &&
      wasSentInGameChannel === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var nation;

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

  if (listRegexp.test(command) === true)
  {
    getSubmittedPretenders(message, options.game);
    return;
  }

  if (pretenderInput[options.game.name] == null || pretenderInput[options.game.name][message.author.id] == null)
  {
    message.channel.send(`You must use the \`${config.prefix}pretenders\` command first, to display the current pretenders submitted.`);
    return;
  }

  if (isNaN(+options.args[0]) === true || pretenderInput[options.game.name][message.author.id][+options.args[0]] == null)
  {
    message.channel.send(`You must specify the number of the nation that you wish to claim/remove/sub. To see the nations submitted, use the \`${config.prefix}pretenders\` command.`);
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

  if (pretenderInput[options.game.name][message.author.id][+options.args[0]] == null)
  {
    message.channel.send(`Select a number from the list.`);
    return;
  }

  nation = pretenderInput[options.game.name][message.author.id][+options.args[0]];

  if (subRegexp.test(command) === true)
  {
    if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false && options.game.isPretenderOwner(nation, options.member.id) === false)
    {
      message.channel.send("Only a gameMaster or the player who submitted this nation can do designate a sub.");
      return;
    }

    subPretender(message, options.game, +options.args[0], options.member);
    return;
  }

  if (options.game.wasStarted === true && options.game.isConvertedToV3 !== true)
  {
    message.channel.send("You cannot claim or remove a pretender after the game has started.");
    return;
  }

  if (claimRegexp.test(command) === true)
  {
    claimPretender(message, options.game, +options.args[0], options.member);
  }

  else if (removeRegexp.test(command) === true)
  {
    if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false && options.game.isPretenderOwner(nation, options.member.id) === false)
    {
      message.channel.send("Only a gameMaster or the player who submitted this nation can remove it.");
      return;
    }

    removePretender(message, options.game, +options.args[0], options.member);
  }

  else
  {
    rw.log("error", `Command was invoked, but no case was recognized.`, {Game: options.game.name, Args: options.args});
    message.channel.send("An error occurred.");
  }
}

function getSubmittedPretenders(message, game)
{
  var listString = "";

  //the list returned is an array of objects containing the nation name and filename, so that
  //the nation name can be shown to players, and the filename used internally for removing it.
  game.getSubmittedPretenders(function(err, list)
  {
    if (err)
    {
      message.channel.send(`An error occurred when fetching the list of pretenders:\n\n\t${err}`);
      return;
    }

    if (pretenderInput[game.name] == null)
    {
      pretenderInput[game.name] = {};
    }

    pretenderInput[game.name][message.author.id] = list;

    list.forEach(function(entry, index)
    {
      if (entry.player != null)
      {
        //This is likely because the member object could not be fetched during getSubmittedPretenders(),
        //so a string was introduced for the player, instead of the usual member object
        if (typeof entry.player === "string")
        {
          listString += `${index}. ${entry.nation.fullName}`.width("40") + `${entry.player}\n`;
        }

        else listString += `${index}. ${entry.nation.fullName}`.width("40") + `${entry.player.user.username}\n`;
      }

      else listString += `${index}. ${entry.nation.fullName}\n`;
    });

    if (game.wasStarted === true)
    {
      message.channel.send(`Here is the list of pretenders and players who control them. You can type \`${config.prefix}sub\` followed by one of the numbers and a mention (\`@username\`) to a user to designate a substitute (this should be done with their consent)\n\n${listString.toBox()}`);
    }

    else if (listString === "")
    {
      message.channel.send(`There are no pretenders submitted yet.`);
    }

    else message.channel.send(`Here is the list of submitted pretenders. You can type \`${config.prefix}claim\` or \`${config.prefix}remove\` followed by one of the numbers to claim or remove one of them. You can also type \`${config.prefix}sub\` followed by one of the numbers and a mention (\`@username\`) to a user to designate a substitute (this should be done with their consent):\n\n${listString.toBox()}`);
  });
}

function subPretender(message, game, number, member)
{
  var entry = pretenderInput[game.name][message.author.id][number];
  var subMemberEntry = message.mentions.members.values().next();

  if (subMemberEntry.value == null)
  {
    message.channel.send(`You must mention (\`@username\`) the user that will sub for the nation in your command.`);
    return;
  }

  game.subPretender(entry.nation.filename, subMemberEntry.value, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      deleteInput(game.name, message.author.id);
      return;
    }

    //remove the member's role if he is the pretender owner, as he is no longer in the game
    if (game.players[member.id] != null && game.players[member.id].nation.filename === entry.nation.filename)
    {
      member.removeRole(game.role, `Designated ${subMemberEntry.value.user.username} as a sub.`);
    }

    subMemberEntry.value.addRole(game.role, `Was designated as a sub by ${member.user.username}.`);
    message.channel.send(`You have designated ${subMemberEntry.value.user.username} as the substitute for the nation ${entry.nation.name}.`);
    subMemberEntry.value.send(`You have been designated as the substitute for the nation ${entry.nation.name} in the game ${game.name} (in the channel ${game.channel.name}, from the guild ${game.guild.name}). If this has been done without your consent, please contact the game's organizer (${game.organizer.user.username}), a GM or an Admin.`);
    rw.log("general", `${subMemberEntry.value} has been designated as the substitute for the nation ${entry.nation.name} in the game ${game.name} and guild ${game.guild.name}.`);
    deleteInput(game.name, message.author.id);
  });
}

function claimPretender(message, game, number, member)
{
  var entry = pretenderInput[game.name][message.author.id][number];

  game.claimPretender(entry.nation, member, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      deleteInput(game.name, message.author.id);
      return;
    }

    member.addRole(game.role);
    message.channel.send(`You have claimed the pretender for the nation ${entry.nation.name}.`);
    rw.log("general", `The pretender for the nation ${entry.nation.name} has been claimed in the game ${game.name}.`);
    deleteInput(game.name, message.author.id);
  });
}

function removePretender(message, game, number, member)
{
  var nation = pretenderInput[game.name][message.author.id][number];

  game.removePretender(entry.nation.filename, member, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      deleteInput(game.name, message.author.id);
      return;
    }

    message.channel.send(`The pretender for ${entry.nation.name} has been deleted.`);
    rw.log("general", `The pretender for ${entry.nation.name} has been deleted in the game ${game.name}.`);
    deleteInput(game.name, message.author.id);
  });
}

function deleteInput(gameName, userID)
{
  delete pretenderInput[gameName][userID];
}
