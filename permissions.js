
const config = require("./config.json");
const guildModule = require("./guild_data.js");
var serverOwners = [];

module.exports.botHasPermission = function(permissionFlag, guild)
{
  if (guild.me.permissions.has(permissionFlag) === true)
  {
    return true;
  }

  else return false;
};

module.exports.botHasPermissions = function(permissionFlagArray, guild)
{
  permissionFlagArray.forEach(function(perm)
  {
    if (guild.me.permissions.has(perm) === false)
    {
      return false;
    }
  });

  return true;
};

module.exports.addServerOwner = function(id)
{
  serverOwners.push(id);
  return;
}

//If an organizer ID is provided, then that user will also pass this check
module.exports.hasRole = function(key, member, guildID, organizerID = null)
{
  let owner = guildModule.getOwner(guildID);
  let roleRequired;

  if (member.id === owner.id)
	{
		return true;
	}

  if (organizerID != null && member.id === organizerID)
  {
    return true;
  }

  //A role id was passed instead of a name
  if (/^\d+$/.test(key) === true)
  {
    if (member.roles.has(key) === true)
  	{
  		return true;
  	}

    else return false;
  }

  switch(key.toLowerCase())
  {
    case "gamemaster":
    roleRequired = guildModule.getGMRole(guildID);
    break;

    case "blitzer":
    roleRequired = guildModule.getBlitzerRole(guildID);
    break;

    case "trusted":
    roleRequired = guildModule.getTrustedRole(guildID);
    break;

    default:
    return false;
  }

  if (member.roles.array.find(function(role)
  {
    return role.id === roleRequired.id;
  }) != null)
  {
    return true;
  }

  else return false;
};

//If an organizer ID is provided, then that user will also pass this check
module.exports.equalOrHigher = function(key, member, guildID, organizerID)
{
  let roleRequired;
  let owner = guildModule.getOwner(guildID);

  if (member.id === owner.id)
	{
		return true;
	}

  if (organizerID != null && member.id === organizerID)
  {
    return true;
  }

  switch(key.toLowerCase())
  {
    case "gamemaster":
    roleRequired = guildModule.getGMRole(guildID);
    break;

    case "blitzer":
    roleRequired = guildModule.getBlitzerRole(guildID);
    break;

    case "trusted":
    roleRequired = guildModule.getTrustedRole(guildID);
    break;

    default:
    return false;
  }

  //user has no roles
  if (member.highestRole == null)
  {
    return false;
  }

  if (member.highestRole.position >= roleRequired.position)
  {
    return true;
  }

  else return false;
};

module.exports.isOrganizer = function(member, organizerID)
{
  if (member.id === organizerID)
  {
    return true;
  }

  else return false;
};

module.exports.isMasterOwner = function(id)
{
  if (id === config.masterOwner && typeof id === "string")
  {
    return true;
  }

  else return false;
}

module.exports.isServerOwner = function(id)
{
  if (serverOwners.includes(id.toLowerCase().trim()) === true)
  {
    return true;
  }

  else if (module.exports.isMasterOwner(id) === true)
  {
    return true;
  }

  else return false;
}

module.exports.isGuildOwner = function(id, guildID)
{
  let owner = guildModule.getOwner(guildID);

  if (id === owner.id)
	{
		return true;
	}

  else return false;
}
