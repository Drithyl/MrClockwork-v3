
const rw = require("./reader_writer.js");
const config = require("./config.json");
const guildModule = require("./guild_data.js");

module.exports.mentionRole = function(role)
{
	if (role == null)
	{
		return "";
	}

	else return role;
}

module.exports.getGameThroughChannel = function(channelID, games)
{
  for (var name in games)
  {
    if (games[name].channel != null && games[name].channel.id === channelID)
    {
      return games[name];
    }
  }

  return null;
}

module.exports.moveGameToRecruitingCategory = function(game, cb)
{
	var parentCategory;

	if (game.isBlitz === true)
	{
		parentCategory = guildModule.getBlitzRecruitingCategory(game.guild.id);
	}

	else parentCategory = guildModule.getRecruitingCategory(game.guild.id);

  game.channel.setParent(parentCategory)
  .then(cb(null))
  .catch(function(err)
  {
    rw.log("error", true, `setParent Error:`, {Game: game.name, Channel: game.channel.name}, err);
    cb(err);
  });
};

module.exports.moveGameToStartedCategory = function(game, cb)
{
	var parentCategory;

	if (game.isBlitz === true)
	{
		parentCategory = guildModule.getBlitzCategory(game.guild.id);
	}

	else parentCategory = guildModule.getGameCategory(game.guild.id);

  game.channel.setParent(parentCategory)
  .then(cb(null))
  .catch(function(err)
  {
    rw.log("error", true, `setParent Error:`, {Game: game.name, Channel: game.channel.name}, err);
    cb(err);
  });
};

module.exports.addGameChannelAndRole = function(gameName, organizer, isBlitz, cb)
{
  module.exports.createGameRole(gameName + " Player", organizer, function(err, gameRole)
  {
    if (err)
    {
      cb(err);
      return;
    }

    module.exports.createGameChannel(gameName, organizer, isBlitz, function(err, channel)
    {
      if (err)
      {
        cb(err);
        return;
      }

      channel.overwritePermissions(gameRole, {READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true}); //this game's role
      cb(null, channel, gameRole);
    });
  });
};

module.exports.createGameChannel = function(name, member, isBlitz, cb)
{
  member.guild.createChannel(name, "text").then(channel =>
  {
    channel.overwritePermissions(member, {READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true, MANAGE_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true}); //this game's organizer
    channel.overwritePermissions(guildModule.getGMRole(member.guild.id), {READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true, MANAGE_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true});
    channel.overwritePermissions(guildModule.getBotID(member.guild.id), {READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true});
    channel.overwritePermissions(member.guild.id, {READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true});  //guild ID is equal to the @everyone role ID

		if (isBlitz === true)
		{
			channel.setParent(guildModule.getBlitzRecruitingCategory(member.guild.id));
		}

		else channel.setParent(guildModule.getRecruitingCategory(member.guild.id));

    cb(null, channel);

  }).catch(error =>
  {
    cb(error);
  });
};

module.exports.createGameRole = function(name, member, cb)
{
  member.guild.createRole({name: name}).then(role =>
  {
    role.setMentionable(true);
    cb(null, role);

  }).catch(error =>
  {
    cb(`The role ${name} could not be created: ${error}`, null);
    return;
  });
};

module.exports.findOrCreateChannel = function(idToFind, name, type, guild, cb)
{
	var channelFound = guild.channels.get(idToFind);

  if (channelFound != null)
  {
    cb(null, channelFound);
    rw.log("general", `Channel ${channelFound.name} already exists.`);
    return;
  }

	try
	{
		guild.createChannel(name, type).then(function(channel)
		{
	    cb(null, channel);
	  });
	}

	catch(err)
	{
		rw.log("error", true, `createChannel Error:`, {Name: name, Type: type, Guild: guild.name}, err);
		cb(err);
	}
};

module.exports.findOrCreateRole = function(idToFind, name, guild, setMentionable, cb)
{
	var role = guild.roles.get(idToFind);

  if (role != null)
  {
    cb(null, role);
    rw.log("general", `Role ${idToFind} already exists.`);
    return;
  }

	try
	{
		guild.createRole({name: name}).then(function(role)
		{
	    if (setMentionable === true)
	    {
	      role.setMentionable(true);
	    }

	    cb(null, role);

	  });
	}

	catch(err)
	{
		rw.log("error", true, `createRole Error:`, {Name: name, Guild: guild.name}, err);
		cb(err);
	}
};

function attemptToFindAndAssignRole(game)
{
  for (var [k, v] of game.guild.roles)
  {
    if (v.name.toLowerCase() === game.name.toLowerCase() + " player")
    {
      game.role = v;
      return true;
    }
  }
}

function attemptToFindAndAssignChannel(game)
{
  for (var [k, v] of game.guild.channels)
  {
    if (v.name.toLowerCase() === game.name.toLowerCase() + "_game")
    {
      game.channel = v;
    }
  }
}
