
const config = require("./config.json");
const rw = require("./reader_writer.js");
const fs = require("fs");
var guildData;
var botID;
var guildObjects = {};


module.exports.init = function(bot)
{
  if (fs.existsSync(config.pathToGuildData) === false)
  {
    fs.writeFileSync(config.pathToGuildData, "{}");
    guildData = {};
  }

  else guildData = require(config.pathToGuildData);

  botID = bot.user.id;

  //Cycle through all the guilds that the bot is on and verify
	//if their presence in the config file is valid
  for (var [id, guild] of bot.guilds)
	{
    if (guildData[id] == null)
    {
      guild.owner.send(`Your guild ${guild.name} cannot be found in the stored data. The bot will be unable to work there. If you have not yet used the command %deploy, you must use it (within a guild channel) for the bot to perform the necessary setup.`);
      rw.log(config.generalLogPath, `The guild ${guild.name} is not included in the config file. The deploy command was probably not used yet. Skipping its initialization.`);
    }

    else
    {
      try
  		{
  			isGuildValid(guild);
  			guildObjects[id] = guild;
  		}

  		catch(err)
  		{
  			rw.logError({Guild: guild.name}, `Error verifying guild: `, err);
  		}
    }
	}

  return this;
};

module.exports.save = function(cb)
{
  rw.saveJSON(config.pathToGuildData, guildData, function(err)
  {
    if (err)
    {
      cb(`Could not save newly created data for your guild ${message.guild.name}. Contact Drithyl#1972 through Discord.`, null);
      return;
    }

    cb(null);
  });
};

module.exports.getBotID = function()
{
  return botID;
};

module.exports.getGuildObject = function(guildID)
{
  verifyGuildID(guildID);
  return guildObjects[guildID];
};

module.exports.getAllGuildObjects = function()
{
  return guildObjects;
};

module.exports.getGuildData = function(guildID)
{
  verifyGuildID(guildID);
  return guildData[guildID];
};

module.exports.getAllGuildsData = function()
{
  return guildData;
};

module.exports.createGuildData = function(guild)
{
  guildData[guild.id] = {};
  guildData[guild.id].roles = {};
  guildData[guild.id].id = guild.id;
  guildData[guild.id].ownerID = guild.ownerID;
  guildObjects[guild.id] = guild;
  return guildData[guild.id];
};

module.exports.getOwner = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let owner = guildObjects[guildID].members.get(guildData[guildID].ownerID);

    if (owner == null)
    {
      throw "Could not find the owner.";
    }

    return owner;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getBlitzGeneralChannel = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let channel = guildObjects[guildID].channels.get(guildData[guildID].blitzGeneralChannelID);

    if (category == null)
    {
      throw "Could not find the channel.";
    }

    return category;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getRecruitingCategory = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let category = guildObjects[guildID].channels.get(guildData[guildID].recruitingCategoryID);

    if (category == null)
    {
      throw "Could not find the category.";
    }

    return category;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getBlitzRecruitingCategory = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let category = guildObjects[guildID].channels.get(guildData[guildID].blitzRecruitingCategoryID);

    if (category == null)
    {
      throw "Could not find the category.";
    }

    return category;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getGameCategory = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let category = guildObjects[guildID].channels.get(guildData[guildID].gameCategoryID);

    if (category == null)
    {
      throw "Could not find the category.";
    }

    return category;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getBlitzCategory = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let category = guildObjects[guildID].channels.get(guildData[guildID].blitzCategoryID);

    if (category == null)
    {
      throw "Could not find the category.";
    }

    return category;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getBlitzerRole = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let role = guildObjects[guildID].roles.get(guildData[guildID].roles.blitzerID);

    if (role == null)
    {
      throw "Could not find the blitzer role.";
    }

    return role;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getGMRole = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let role = guildObjects[guildID].roles.get(guildData[guildID].roles.gameMasterID);

    if (role == null)
    {
      throw "Could not find the GM role.";
    }

    return role;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.getTrustedRole = function(guildID)
{
  try
  {
    verifyGuildID(guildID);
    let role = guildObjects[guildID].roles.get(guildData[guildID].roles.trustedID);

    if (role == null)
    {
      throw "Could not find the trusted role.";
    }

    return role;
  }

  catch(err)
  {
    throw err;
  }
};

module.exports.botHasGuild = function(id)
{
  if (guildData[id] != null)
  {
    return true;
  }

  else return false;
}

function verifyGuildID(id)
{
  if (guildObjects[id] == null || guildData[id] == null)
  {
    throw "Could not find this guild ID.";
  }
}

function isGuildValid(guild)
{
	if (guildData[guild.id].roles == null)
	{
		guild.owner.send(`Your guild ${guild.name} seems to be missing its roles data. The bot will be unable to work there. If you have not yet used the command %deploy, you must use it (within a guild channel) for the bot to perform the necessary setup.`);
		throw `The guild ${guild.name} is lacking a roles property. Skipping its initialization.`;
	}

	if (guildData[guild.id].roles.gameMasterID == null)
	{
		guild.owner.send(`Your guild ${guild.name} seems to be missing the ${config.gameMasterRoleName} role. The bot will be unable to work there. You can use the %deploy command again to recreate the missing categories and roles.`);
		throw `The guild ${guild.name} is missing the gameMaster role ID. Skipping its initialization.`;
	}

	else if (guild.roles.get(guildData[guild.id].roles.gameMasterID == null))
	{
		guild.owner.send(`Your guild ${guild.name}'s ${config.gameMasterRoleName} stored role ID is incorrect, or the role is missing. The bot will be unable to work there. You can use the %deploy command again to recreate the missing categories and roles.`);
		throw `The guild ${guild.name}'s ${config.gameMasterRoleName} cannot be retrieved. Skipping its initialization.`;
	}

	else if (guildData[guild.id].roles.blitzerID == null)
	{
		guild.owner.send(`Your guild ${guild.name} seems to be missing the ${config.blitzerRoleName} role. The bot will be unable to work there. You can use the %deploy command again to recreate the missing categories and roles.`);
		throw `The guild ${guild.name} is missing the blitzer role ID. Skipping its initialization.`;
	}

	else if (guild.roles.get(guildData[guild.id].roles.blitzerID == null))
	{
		guild.owner.send(`Your guild ${guild.name}'s ${config.blitzerRoleName} stored role ID is incorrect, or the role is missing. The bot will be unable to work there. You can use the %deploy command again to recreate the missing categories and roles.`);
		throw `The guild ${guild.name}'s ${config.blitzerRoleName} cannot be retrieved. Skipping its initialization.`;
	}

	else if (guildData[guild.id].roles.trustedID == null)
	{
		guild.owner.send(`Your guild ${guild.name} seems to be missing the ${config.trustedRoleName} role. The bot will be unable to work there. You can use the %deploy command again to recreate the missing categories and roles.`);
		throw `The guild ${guild.name} is missing the trusted role ID. Skipping its initialization.`;
	}

	else if (guild.roles.get(guildData[guild.id].roles.trustedID == null))
	{
		guild.owner.send(`Your guild ${guild.name}'s ${config.trustedRoleName} stored role ID is incorrect, or the role is missing. The bot will be unable to work there. You can use the %deploy command again to recreate the missing categories and roles.`);
		throw `The guild ${guild.name}'s ${config.trustedRoleName} cannot be retrieved. Skipping its initialization.`;
	}
}
