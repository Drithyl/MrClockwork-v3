
const rw = require("./reader_writer.js");

const brokenPipeErrRegexp = new RegExp("broken\\s*pipe", "ig");

//Exact error: "myloadmalloc: can't open [path].tga/rgb/png"
const mapImgNotFoundErrRegexp = new RegExp("can\\'t\\s*open\\s*.+.(tga)|(.rgb)|(.rgb)|(.png)$", "ig");

//Exact error: "bc: king has throne in capital (p43 c385 h160 vp2) [new game created]"
const throneInCapitalErrRegexp = new RegExp("king\\s*has\\s*throne\\s*in\\s*capital", "ig");


module.exports = function(game, errStr)
{
  if (typeof errStr !== "string")
  {
    return `Could not identify error.`;
  }

  if (brokenPipeErrRegexp.test(errStr) === true)
  {
    handleBrokenPipe(game, errStr);
  }

  else if (mapImgNotFoundErrRegexp.test(errStr) === true)
  {
    handleMapImgNotFound(game, errStr);
  }

  else if (throneInCapitalErrRegexp.test(errStr) === true)
  {
    handleThroneInCapital(game, errStr);
  }

  else sendWarning(game, `The game ${game.name} reported the error: ${errStr}`);
}

function handleBrokenPipe(game, errStr)
{

}

function handleMapImgNotFound(game, errStr)
{
  //if game started less than 5 minutes ago, set wasStarted to false as it could not do so properly
  if (Date.now() - game.startedAt <= 300000)
  {
    game.wasStarted = false;
  }

  sendWarning(game, `Dominions reported an error (probably crashed): One or more of the image files of the selected map could not be found. Make sure they've been uploaded and that the .map file points to the proper names.`);
}

function handleThroneInCapital(game, errStr)
{
  //if game started less than 5 minutes ago, set wasStarted to false as it could not do so properly
  if (Date.now() - game.startedAt <= 300000)
  {
    game.wasStarted = false;
  }

  sendWarning(game, `Dominions reported an error (possibly crashed): A throne was probably forced to start on a player's capital. Check the pre-set starts and thrones in the .map file (original error is: bc: king has throne in capital (p43 c385 h160 vp2) [new game created])`);
}

function sendWarning(game, warning)
{
  if (game.channel != null)
  {
    game.channel.send(warning);
  }

  else if (game.organizer != null)
  {
    game.organizer.send(warning);
  }

  rw.log("error", `The game ${game.name} reported the following error from the slave server:\n\n${warning}`);
}
