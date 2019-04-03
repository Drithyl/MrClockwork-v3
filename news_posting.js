
const config = require("./config.json");
const rw = require("./reader_writer.js");
const guildModule = require("./guild_data.js");

module.exports.post = function(str, guildID = null)
{
  if (guildID != null)
  {
    let channel = guildModule.getNewsChannel(guildID);

    if (typeof channel.send != "function")
    {
      rw.writeToGeneralLog(`The channel ${channel.name} does not contain a send() function.`);
      return;
    }

    channel.send(str).catch((err) => {rw.log("error", true, `Error posting news: `, {Channel: channel}, err);});
    return;
  }

  guildModule.getNewsChannels().forEach(function(channel)
  {
    if (typeof channel.send != "function")
    {
      rw.writeToGeneralLog(`The channel ${channel.name} does not contain a send() function.`);
    }

    else
    {
      channel.send(str).catch((err) => {rw.log("error", true, `Error posting news: `, {Channel: channel}, err);});
    }
  });
}
