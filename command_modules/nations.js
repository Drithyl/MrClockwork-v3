
const config = require("../config.json");
const translator = require("../translator.js");
const regexp = new RegExp(`^${config.prefix}NATIONS`, "i");
const dom4Regexp = new RegExp("(DOM4)|(DOMINIONS4)", "i");
const dom5Regexp = new RegExp("(DOM5)|(DOMINIONS5)", "i");
const eaRegexp = new RegExp("(1)|(EA)|(EARLY(AGE)?)", "i");
const maRegexp = new RegExp("(2)|(MA)|(MIDDLE(AGE)?)", "i");
const laRegexp = new RegExp("(3)|(LA)|(LATE(AGE)?)", "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "dm";

module.exports.getReadableCommand = function()
{
  return "nations";
};

module.exports.getCommandArguments = ["`dom4`/`dom5`", "`ea`/`ma`/`la`"];

module.exports.getHelpText = function()
{
  return `Displays a the full list of nations for a given game and a given era, including their full name, filename, and nation number.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var era;
  var gameType;
  var list;
  var str = "";

  if (dom4Regexp.test(options.args[0]) === true)
  {
    str += "List of dom4 nation numbers and names ";
    gameType = config.dom4GameTypeName;
  }

  else if (dom5Regexp.test(options.args[0]) === true)
  {
    str += "List of dom5 nation numbers and names ";
    gameType = config.dom5GameTypeName;
  }

  if (eaRegexp.test(options.args[1]) === true)
  {
    era = "1";
    str += "for the **Early Age**:\n"
  }

  else if (maRegexp.test(options.args[1]) === true)
  {
    era = "2";
    str += "for the **Middle Age**:\n"
  }

  else if (laRegexp.test(options.args[1]) === true)
  {
    era = "3";
    str += "for the **Late Age**:\n"
  }

  list = translator.domNationList(gameType, era);

  if (list == null)
  {
    message.channel.send(`The first argument of the command must be a game (\`dom4\` or \`dom5\`), and the second one the era for which you want to display the nations (\`ea\`, \`ma\` or \`la\`).`);
    return;
  }

  message.channel.send(str + list.toBox(), {split: {prepend: "```", append: "```"}});
};
