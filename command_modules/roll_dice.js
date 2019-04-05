
const config = require("../config.json");
const dice = require("../dice.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}ROLL`, "i");
const diceExpression = new RegExp("^(\\d+d?\\d*\\+?\\+?)+$", "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "roll";
};

module.exports.getCommandArguments = ["`[a dice expression, i.e. '5d6', '5d6+5', '5d6++5', '5d6+10d10', etc.]`"];

module.exports.getHelpText = function()
{
  return `Rolls dice. Several dice can be chained together, i.e. \`5d6+10d10\`. Adding a + after a dice expression will make them explosive, i.e. \`5d6++10d10+\`.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (regexp.test(command) === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let input = "";

  if (options.args[0] == null)
  {
    message.channel.send(`You must add a dice expression to be rolled.`);
    return;
  }

  if (Array.isArray(options.args) === true)
  {
    for (var i = 0; i < options.args.length; i++)
    {
      let exp = options.args[i];

      if (diceExpression.test(exp) === false)
      {
        message.channel.send(`The arguments were improperly formed. Type \`${config.prefix}${module.exports.getReadableCommand()}\` followed by the dice you want to roll. Several dice can be chained together, i.e. \`5d6+10d10\`. Adding a + after a dice expression will make them explosive, i.e. \`5d6++10d10+\`.`);
        return;
      }

      input += exp;
    }
  }

  message.channel.send(dice.processRolls(input.trim()));
}
