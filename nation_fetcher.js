
const config = require("./config.json");
const dom4Nations = require("./dom4_nations.json");
const dom5Nations = require("./dom5_nations.json");

module.exports.fetch = function(identifier, gameType, era)
{
  let nationPool;

  if (config.dom4GameTypeName === gameType)
  {
    nationPool = dom4Nations;
  }

  else if (config.dom5GameTypeName === gameType)
  {
    nationPool = dom5Nations;
  }

  if (nationPool != null && nationPool[era] != null)
  {
    nationPool = nationPool[era];
  }

  if (isNaN(identifier) === false)
  {
    return throughNumber(identifier, nationPool);
  }

  if (typeof identifier === "string")
  {
    //all full names contain a coma after the normal name, like "Arcoscephale, Golden Era"
    if (/\,/.test(identifier) === true)
    {
      return matchStrIdentifier(identifier, "fullName", nationPool);
    }

    else if (/\.2h$/i.test(identifier))
    {
      return matchStrIdentifier(identifier, "filename", nationPool);
    }

    else return matchStrIdentifier(identifier, "name", nationPool);
  }

  else return null;
}

function throughNumber(number, pool)
{
  return pool.find((nation) =>
  {
    return nation.number == number;
  });
}

function matchStrIdentifier(identifier, key, pool)
{
  let match;

  if (pool == null)
  {
    for (era in dom4Nations)
    {
      match = dom4Nations[era].concat(dom5Nations[era]).find((nation) => nation[key] === identifier);

      if (match != null)
      {
        return match;
      }
    }

    return match;
  }

  if (Array.isArray(pool) === true)
  {
    return pool.find((nation) => nation[key] === identifier);
  }

  else
  {
    for (era in pool)
    {
      match = pool[era].find((nation) => nation[key] === identifier);

      if (match != null)
      {
        return match;
      }
    }

    return match;
  }
}
