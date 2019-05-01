
const config = require("./config.json");
const nations = require("./nation_fetcher.js");

module.exports.create = function(member, nationObj, game)
{
  let record =
  {
    id: member.id,
    member: member,
    nation: nationObj,
    reminders: [],
    gameName: game.name
  };

  if (game.gameType === config.dom5GameTypeName)
  {
    record.wentAI = false;
    record.subbedOutBy = null;
    record.pastNations = [];
    record.isReceivingBackups = false;
    record.isReceivingScoreDumps = false;
  }

  return record;
};

module.exports.isRecord = function(object)
{
  if (object == null)
  {
    return false;
  }

  if (Array.isArray(object) === false &&
      typeof object === "object" &&
      typeof object.nation === "object" &&
      Array.isArray(object.reminders) === true &&
      typeof object.gameName === "string")
  {
    return true;
  }

  else return false;
}
