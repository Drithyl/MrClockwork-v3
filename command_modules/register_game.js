
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const hoster = require("../hoster.js");
const rw = require("../reader_writer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}REGISTER`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "register";
};

module.exports.getCommandArguments = ["`[a hosted game's name]`"];

module.exports.getHelpText = function()
{
  return `Creates a role and a channel for the given game. Bear in mind that hosting will normally already create these, therefore this command should only be necessary in very specific circumstances (like if the original game channel was deleted).`;
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
  var game;
  let roleIDToFind;
  let channelIDToFind;

  if (typeof options.args[0] !== "string")
  {
    message.channel.send(`You must specify for which game you are trying to create a channel.`);
    return;
  }

  game = options.games[options.args[0].toLowerCase().trim()];
  roleIDToFind = (game.role == null) ? null : game.role.id;
  channelIDToFind = (game.channel == null) ? null : game.channel.id;

  if (game == null)
  {
    message.channel.send(`The game ${options.args[0]} does not exist. Make sure you've spelled the name correctly.`);
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  rw.log("general", `${options.member.user.username} requested to register the game ${game.name}.`);

  channelFunctions.findOrCreateRole(roleIDToFind, `${game.name} Player`, message.guild, true, function(err, role)
  {
    if (err)
    {
      message.channel.send(`Could not find or create a role to assign to the game.`);
      return;
    }

    game.role = role;

    channelFunctions.findOrCreateChannel(channelIDToFind, `${game.name}`, "text", message.guild, function(err, channel)
    {
      if (err)
      {
        message.channel.send(`Could not find or create a channel to assign to the game.`);
        return;
      }

      game.channel = channel;

      game.save(function(err)
      {
        if (err)
        {
          message.channel.send(`Channel and role created/found, but data could not be saved.`);
          return;
        }

        if (game.wasStarted === true)
        {
          channelFunctions.moveGameToStartedCategory(game, function(err)
          {
            if (err)
            {
              message.channel.send(`Role and channel created/found successfully, but could not move channel to the right category.`);
            }

            else message.channel.send(`Role and channel created/found successfully.`);
          });
        }

        else
        {
          channelFunctions.moveGameToRecruitingCategory(game, function(err)
          {
            if (err)
            {
              message.channel.send(`Role and channel created/found successfully, but could not move channel to the right category.`);
            }

            else message.channel.send(`Role and channel created/found successfully.`);
          });
        }

        newsModule.post(`${message.author.username} assigned the channel ${game.channel} to the game ${game.name}.`, game.guild.id);
      });
    });
  });
};
