
const config = require("../config.json");

//Load indexes to load each setting module in the proper order
const coe4SettingsIndex = require("./coe4/index.js");
const dom4SettingsIndex = require("./dom4/index.js");
const dom5SettingsIndex = require("./dom5/index.js");

const modules =
{
  [config.coe4GameTypeName]: [],
  [config.dom4GameTypeName]: [],
  [config.dom5GameTypeName]: []
}

//exports an object containing all the settings modules ordered
//by game type name and then by filename in an array
module.exports.get = function(gameType, key)
{
  let settingFound;

  if (modules[gameType] == null)
  {
    throw `Incorrect gameType ${gameType}; cannot find setting module.`;
  }

  for (var filename in modules[gameType])
  {
    if (modules[gameType][filename].getKey() === key)
    {
      settingFound = mod;
    }
  }

  if (settingFound == null)
  {
    throw `Incorrect setting key ${key} provided; cannot find setting module.`;
  }

  return settingFound;
};

module.exports.getAll = function(gameType)
{
  if (modules[gameType] == null)
  {
    throw `Incorrect gameType ${gameType}; cannot find setting module.`;
  }

  //return a copy, don't want the original altered
  return [...modules[gameType]];
};

console.log("Indexing setting modules...");

coe4SettingsIndex.forEach(function(filename)
{
  modules[config.coe4GameTypeName].push(require(`./coe4/${filename}`));
});

dom4SettingsIndex.forEach(function(filename)
{
  modules[config.dom4GameTypeName].push(require(`./dom4/${filename}`));
});

dom5SettingsIndex.forEach(function(filename)
{
  modules[config.dom5GameTypeName].push(require(`./dom5/${filename}`));
});