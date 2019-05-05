
const config = require("../../config.json");
const rw = require("../../reader_writer.js");
const valueChecker = require("../../settings_value_checker.js");
const nationsJSON = require("../../dom4_nations.json");
const eraSetting = require("./era.js");

const key = "aiNations";
const name = "AI Nations";
const noneValueRegexp = new RegExp("^none", "ig");
const nationValueRegexp = new RegExp("^(\\d+\\s*\\w+\\,?\\s*)+", "ig");
const cue = `**${name}:** \`none\` for no AI. Separate each nation with a comma (,). The format is the following: 'nation number' 'difficulty', 'nation number' 'difficulty', etc. The difficulties are easy, normal, difficult, mighty, master, and impossible. Type \`${config.prefix}nations dom5\` to get the list of nations and their codes. An example would be: \`82 impossible, 50 master, 45 difficult\`.`;

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
    let nationObj = nationsJSON[era].find((nation) => natNumber == nation.number);

    if (nationObj == null)
    {
      rw.log("error", `Could not find nation object for natNumber ${natNumber} and era ${era} in the game ${game.name}`);
      nations += `${natNumber} (${setting[natNumber]}) `;
    }

    else nations += `${nationObj.name} (${setting[natNumber]}) `;
  }

  return nations;
};

module.exports.validate = function(input, validatedSettings, server, cb)
{
  let obj = {};
  let list = input.split(",");

	if (noneValueRegexp.test(input) === true)
  {
    cb(null, "none");
    return;
  }

  if (nationValueRegexp.test(input) === false)
  {
    cb(`Invalid nation list format. Please follow the example provided in the cue.`);
    return;
  }

	for (var i = 0; i < list.length; i++)
	{
    let natNumber = +list[i].replace(/\D/g, "");
    let difficulty = list[i].replace(/\d/g, "").trim().toLowerCase();

    if (isNaN(natNumber) === true)
    {
      cb(`Each nation must be specified by its in-game number. To see a list, type \`${config.prefix}nations dom5\`.`);
      return;
    }

    else if (difficulty != "easy" && difficulty != "normal" && difficulty != "difficult" && difficulty != "mighty" && difficulty != "master" && difficulty != "impossible")
    {
      cb(`${difficulty} is not a valid difficulty. The options are easy, normal, difficult, mighty, master, and impossible.`);
      return;
    }

    else if (isNationInEra(validatedSettings[eraSetting.getKey()], natNumber) === false)
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
  let nation = nationsJSON[eraNumber].find((nation) => natiom.number === nationNumber);

  if (nation != null)
  {
    return true;
  }

  else return false;
}
