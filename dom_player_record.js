
const config = require("./config.json");
const nations = require("./nation_fetcher.js");

module.exports.create = function(id, nationObj, game)
{
  let record =
  {
    nation: nationObj,
    reminders: [],
    gameName: game.name
  };

  if (game.gameType === config.dom5GameTypeName)
  {
    record.wentAI = false;
    record.subbedOutBy = null;
    record.isReceivingBackups = false;
    record.isReceivingScoreDumps = false;
  }

  return record;
};
