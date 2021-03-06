
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const guildModule = require("../guild_data.js");
const regexp = new RegExp(`^${config.prefix}DEPLOY`, "i");
const successStr = `Success! You can now use the bot to its full extent. You will notice that a few roles and categories have been created. These are necessary for the bot to operate. You can rename them and change their permissions, but if they are deleted, you will have to use the \`${config.prefix}deploy\` command again. To get started, you can get a list of commands by typing the command \`${config.prefix}help\` in any channel.`

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "deploy";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Only useable by the guild's owner. This is the first command that must be used after the bot is added to a guild, so that it can deploy the necessary categories and roles. It can be used again to re-create missing categories and roles.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var data;

  if (message.author.id !== message.guild.ownerID && permissions.isMasterOwner(message.author.id) === false)
  {
    message.channel.send(`Only the owner of the guild can use the deploy command.`);
    return;
  }

  if (permissions.botHasPermission("MANAGE_CHANNELS", message.guild) === false)
  {
    message.channel.send("The bot needs permissions to manage channels and roles before it can be deployed.");
    return;
  }

  if (permissions.botHasPermission("MANAGE_ROLES", message.guild) === false)
  {
    message.channel.send("The bot needs permissions to manage channels and roles before it can be deployed.");
    return;
  }

  try
  {
    data = guildModule.getGuildData(message.guild.id);
  }

  catch(err)
  {
    //create the guild data, since it can't be found
    data = guildModule.createGuildData(message.guild);
  }

  deploy(message.guild, data, function(err)
  {
    //IMPORTANT: this error does not return the function, because the data must be saved even if incomplete
    if (err)
    {
      message.channel.send(err);
    }

    rw.log("general", "Saving guild data...");
    guildModule.save(function(err)
    {
      if (err)
      {
        message.channel.send(err);
        return;
      }

      message.channel.send(successStr);
      rw.log("general", "Saved successfully!");
    });
  });
};

function deploy(guild, data, cb)
{
  rw.log("general", `Deploying the bot...`);

  channelFunctions.findOrCreateRole(data.roles.gameMasterID, config.gameMasterRoleName, guild, true, function(err, gameMasterRole)
  {
    if (err)
    {
      cb(`An error occurred when creating the gameMaster role and deployment could not be finished: ${err}.`);
      return;
    }

    data.roles.gameMasterID = gameMasterRole.id;
    rw.log("general", `Created role ${gameMasterRole.name} (position ${gameMasterRole.position}).`);

    channelFunctions.findOrCreateRole(data.roles.blitzerID, config.blitzerRoleName, guild, true,  function(err, blitzerRole)
    {
      if (err)
      {
        cb(`An error occurred when creating the blitzer role and deployment could not be finished: ${err}.`);
        return;
      }

      data.roles.blitzerID = blitzerRole.id;
      rw.log("general", `Created role ${blitzerRole.name} (position ${blitzerRole.position}).`);

      channelFunctions.findOrCreateRole(data.roles.trustedID, config.trustedRoleName, guild, false,  function(err, trustedRole)
      {
        if (err)
        {
          cb(`An error occurred when creating the trusted role and deployment could not be finished: ${err}.`);
          return;
        }

        data.roles.trustedID = trustedRole.id;
        rw.log("general", `Created role ${trustedRole.name} (position ${trustedRole.position}).`);

        channelFunctions.findOrCreateChannel(data.newsChannelID, config.newsChannelName, "text", guild, function(err, newsChannel)
        {
          if (err)
          {
            cb(`An error occurred when creating the news channel and deployment could not be finished: ${err}.`);
            return;
          }

          //everyone permissions are restricted in the blitz channel
          newsChannel.overwritePermissions(guild.id, {USE_EXTERNAL_EMOJIS: false, MENTION_EVERYONE: false, SEND_TTS_MESSAGES: false, VIEW_CHANNEL: true, SEND_MESSAGES: false, MANAGE_MESSAGES: false, EMBED_LINKS: false, ATTACH_FILES: false});
          newsChannel.overwritePermissions(guildModule.getBotID(), {USE_EXTERNAL_EMOJIS: true, MENTION_EVERYONE: true, SEND_MESSAGES: true, MANAGE_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true});
          data.newsChannelID = newsChannel.id;
          rw.log("general", `Created channel ${newsChannel.name}.`);

          channelFunctions.findOrCreateChannel(data.helpChannelID, config.helpChannelName, "text", guild, function(err, helpChannel)
          {
            if (err)
            {
              cb(`An error occurred when creating the help channel and deployment could not be finished: ${err}.`);
              return;
            }

            //everyone permissions are restricted in the blitz channel
            helpChannel.overwritePermissions(guild.id, {USE_EXTERNAL_EMOJIS: false, MENTION_EVERYONE: false, SEND_TTS_MESSAGES: false, VIEW_CHANNEL: true, SEND_MESSAGES: false, MANAGE_MESSAGES: false, EMBED_LINKS: false, ATTACH_FILES: false});
            helpChannel.overwritePermissions(guildModule.getBotID(), {USE_EXTERNAL_EMOJIS: true, MENTION_EVERYONE: true, SEND_MESSAGES: true, MANAGE_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true});
            data.helpChannelID = helpChannel.id;
            rw.log("general", `Created channel ${helpChannel.name}.`);

            channelFunctions.findOrCreateChannel(data.blitzGeneralChannelID, config.blitzGeneralChannelName, "text", guild, function(err, blitzGeneralChannel)
            {
              if (err)
              {
                cb(`An error occurred when creating the blitz general channel and deployment could not be finished: ${err}.`);
                return;
              }

              //everyone permissions are restricted in the blitz channel
              blitzGeneralChannel.overwritePermissions(guild.id, {VIEW_CHANNEL: false, SEND_MESSAGES: false, MANAGE_MESSAGES: false, EMBED_LINKS: false, ATTACH_FILES: false});
              blitzGeneralChannel.overwritePermissions(blitzerRole, {VIEW_CHANNEL: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true, EMBED_LINKS: true, ATTACH_FILES: true});

              data.blitzGeneralChannelID = blitzGeneralChannel.id;
              rw.log("general", `Created channel ${blitzGeneralChannel.name}.`);

              channelFunctions.findOrCreateChannel(data.recruitingCategoryID, config.recruitingCategoryName, "category", guild, function(err, recruitingCategory)
              {
                if (err)
                {
                  cb(`An error occurred when creating the recruiting category and deployment could not be finished: ${err}.`);
                  return;
                }

                data.recruitingCategoryID = recruitingCategory.id;
                rw.log("general", `Created category ${recruitingCategory.name}.`);

                channelFunctions.findOrCreateChannel(data.blitzRecruitingCategoryID, config.blitzRecruitingCategoryName, "category", guild, function(err, blitzRecruitingCategory)
                {
                  if (err)
                  {
                    cb(`An error occurred when creating the recruiting category and deployment could not be finished: ${err}.`);
                    return;
                  }

                  data.blitzRecruitingCategoryID = blitzRecruitingCategory.id;
                  rw.log("general", `Created category ${blitzRecruitingCategory.name}.`);

                  channelFunctions.findOrCreateChannel(data.gameCategoryID, config.gameCategoryName, "category", guild, function(err, gameCategory)
                  {
                    if (err)
                    {
                      cb(`An error occurred when creating the game category and deployment could not be finished: ${err}.`);
                      return;
                    }

                    data.gameCategoryID = gameCategory.id;
                    rw.log("general", `Created category ${gameCategory.name}.`);

                    channelFunctions.findOrCreateChannel(data.blitzCategoryID, config.blitzCategoryName, "category", guild, function(err, blitzCategory)
                    {
                      if (err)
                      {
                        cb(`An error occurred when creating the blitz category and deployment could not be finished: ${err}.`);
                        return;
                      }

                      data.blitzCategoryID = blitzCategory.id;
                      rw.log("general", `Created category ${blitzCategory.name}.`);
                      cb(null);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}
