
const rw = require("../../reader_writer.js");
const valueChecker = require("../../settings_value_checker.js");
const nationsJSON = require("../../dom5_nations.json");
const eraSetting = require("./era.js");

const key = "aiNations";
const name = "AI Nations";
const expectedType = "RegExp";
const expectedValue = new RegExp("^((none)|(\\d+\\w+\\,?)+)", "i");
const cue = `**${name}:** 'none' for no AI. Separate each nation with a comma (,). The format is the following: 'nation number' 'difficulty', 'nation number' 'difficulty', etc. The difficulties are easy, normal, difficult, mighty, master, and impossible. Type \`%nations dom5\` to get the list of nations and their codes. An example would be: \`82 impossible, 50 master, 45 difficult\`.`;

module.exports.getKey = function()
{
  return key;
};

module.exports.getName = function()
{
  return name;
};

module.exports.getCue = function()
{
  return cue;
};

module.exports.toExeArguments = function(setting)
{
  let args = [];

  if (typeof setting === "object")
  {
    for (var nation in setting)
    {
      if (setting[nation].toLowerCase() === "easy")
      {
        args.push("--easyai", nation);
      }

      else if (setting[nation].toLowerCase() === "normal")
      {
        args.push("--normai", nation);
      }

      else if (setting[nation].toLowerCase() === "difficult")
      {
        args.push("--diffai", nation);
      }

      else if (setting[nation].toLowerCase() === "mighty")
      {
        args.push("--mightyai", nation);
      }

      else if (setting[nation].toLowerCase() === "master")
      {
        args.push("--masterai", nation);
      }

      else if (setting[nation].toLowerCase() === "impossible")
      {
        args.push("--impai", nation);
      }
    }

    return args;
  }

  else return [];
};

module.exports.toInfo = function(setting, game)
{
  let nations = `${name}: `;
  let era = game.settings[eraSetting.getKey()];

  if (/^none$/i.test(setting) === true)
  {
    return `${name}: none`;
  }

  if (era == null)
  {
    return `${name}: incorrect era`
  }

  for (var natNumber in setting)
  {
    nations += `${nationsJSON[era].find(function(nation)
    {
      if (natNumber == nation.number)
      {
        return nation;
      }
    }).name} (${setting[natNumber]}) `;
  }

  return nations;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  if (valueChecker.check(input, expectedValue, expectedType) === false)
  {
    cb("Invalid input. Please re-read the cue and try again.");
    return;
  }

  let obj = {};
  let list = input.split(",");

	if (input.toLowerCase() === "none")
  {
    cb(null, "none");
    return;
  }

	for (var i = 0; i < list.length; i++)
	{
    let natNumber = +list[i].replace(/\D/g, "");
    let difficulty = list[i].replace(/\d/g, "").trim().toLowerCase();

    if (isNaN(natNumber) === true)
    {
      rw.log(null, `validateAIPlayers() Error: Nation is not a number. Input was: ${natNumber}.`);
      cb("Each nation must be specified by its in-game number. To see a list, type `%nations dom5`.");
      return;
    }

    else if (difficulty != "easy" && difficulty != "normal" && difficulty != "difficult" && difficulty != "mighty" && difficulty != "master" && difficulty != "impossible")
    {
      rw.log(null, `validateAIPlayers() Error: Invalid diffulty. Input was: ${difficulty}.`);
      cb(`${difficulty} is not a valid diffulty. The options are easy, normal, difficult, mighty, master, and impossible.`);
      return;
    }

    else if (isNationInEra(validatedSettings[era.getKey()], natNumber) === false)
    {
      cb(`The nation number ${natNumber} does not belong to the era you chose for this game.`);
      return;
    }

    obj[natNumber] = difficulty;
  }

  cb(null, obj);
}

function isNationInEra(eraNumber, nationNumber)
{
  nationsJSON[eraNumber].find(function(nation)
  {
    if (nation.number === nationNumber)
    {
      return true;
    }

    else return false;
  });
}
