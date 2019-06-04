
const rw = require("./reader_writer.js");

//Exact error: "Failed to create temp dir 'C:\Users\MistZ\AppData\Local\Temp/dom5_94132'"
const failedToCreateTmpDirErrRegexp = new RegExp("Failed\\s*to\\s*\\create\\s*temp\\s*dir", "i");

//Exact error: "send: Broken pipe"
const brokenPipeErrRegexp = new RegExp("broken\\s*pipe", "i");

//Exact error: "bind: Address already in use"
const addressInUseErrRegexp = new RegExp("address\\s*already\\s*in\\s*use", "i");

//Exact error: "Terminated"
const terminatedErrRegexp = new RegExp("terminated", "i");

//Exact error: "Map specified by --mapfile was not found"
const mapNotFoundErrRegexp = new RegExp("Map\\s*specified\\s*by\\s*--mapfile", "i");

//Exact error: "myloadmalloc: can't open [path].tga/rgb/png"
const mapImgNotFoundErrRegexp = new RegExp("can\\'t\\s*open\\s*.+.(tga)|(.rgb)|(.rgb)|(.png)$", "i");

//Exact error: "bc: king has throne in capital (p43 c385 h160 vp2) [new game created]"
const throneInCapitalErrRegexp = new RegExp("king\\s*has\\s*throne\\s*in\\s*capital", "i");

//Exact error: "bad ai player"
const badAiPlayerErrRegexp = new RegExp("bad\\s*ai\\s*player", "i");

//Exact error: "/home/steam/Steam/Dominions5/dom5.sh: line 20: 26467 Aborted                 (core dumped) "$BIN" "$@""
const coreDumpedErrRegexp = new RegExp("\\(core\\s*dumped\\)", "i");

//Exact error: "Något gick fel!". Should come last in handling as some more
//errors will also contain this bit into them
const nagotGickFelErrRegexp = new RegExp("gick\\s*fel", "i");

/* Exact error: "Dominions version is too old           *
*                Get an update at www.illwinter.com     *
*                myversionX fileversionY nationZ"       */
const versionTooOldErrRegexp = new RegExp("version\\s*is\\s*too\\s*old", "i");

//Exact error: "h_mkitms"
//johan has stated that this is an error about forging a bad magic item that shouldn't happen
const itemForgingErrRegexp = new RegExp("h_mkitms", "i");

//Exact error: "Failed to create /[statuspage name]"
const fileCreationErrRegexp = new RegExp("Failed\\s*to\\s*create", "i");

module.exports = function(game, errStr)
{
  if (typeof errStr !== "string")
  {
    return `Could not identify error.`;
  }

  if (failedToCreateTmpDirErrRegexp.test(errStr) === true)
  {
    handleFailedToCreateTmpDir(game, errStr);
  }

  else if (brokenPipeErrRegexp.test(errStr) === true)
  {
    handleBrokenPipe(game, errStr);
  }

  else if (addressInUseErrRegexp.test(errStr) === true)
  {
    handleAddressInUse(game, errStr);
  }

  else if (terminatedErrRegexp.test(errStr) === true)
  {
    handleTerminated(game, errStr);
  }

  else if (mapNotFoundErrRegexp.test(errStr) === true)
  {
    handleMapNotFound(game, errStr);
  }

  else if (mapImgNotFoundErrRegexp.test(errStr) === true)
  {
    handleMapImgNotFound(game, errStr);
  }

  else if (throneInCapitalErrRegexp.test(errStr) === true)
  {
    handleThroneInCapital(game, errStr);
  }

  else if (badAiPlayerErrRegexp.test(errStr) === true)
  {
    handleBadAiPlayer(game, errStr);
  }

  else if (coreDumpedErrRegexp.test(errStr) === true)
  {
    handleCoreDumped(game, errStr);
  }

  else if (nagotGickFelErrRegexp.test(errStr) === true)
  {
    handleNagotGickFel(game, errStr);
  }

  else if (versionTooOldErrRegexp.test(errStr) === true)
  {
    handleVersionTooOld(game, errStr);
  }

  else if (itemForgingErrRegexp.test(errStr) === true)
  {
    handleItemForgingErr(game, errStr);
  }

  else if (fileCreationErrRegexp.test(errStr) === true)
  {
    handleFileCreationErr(game, errStr);
  }

  else
  {
    rw.log("error", `The game ${game.name} reported an unknown error: ${errStr}`);
    sendWarning(game, `The game ${game.name} reported the error: ${errStr}`);
  }
}

function handleFailedToCreateTmpDir(game, errStr)
{
  sendWarning(game, `Dominions reported an error: the game instance could not be started because it failed to create a temp dir. Try killing it and launching it again.`);
}

function handleBrokenPipe(game, errStr)
{

}

function handleAddressInUse(game, errStr)
{
  sendWarning(game, `The port used by this game is already in use. Most likely the game failed to shut down properly, so killing it and relaunching it should work.`);
}

function handleTerminated(game, errStr)
{

}

function handleNagotGickFel(game, errStr)
{
  sendWarning(game, `Dominions crashed due to an error.`);
}

function handleMapNotFound(game, errStr)
{
  //if game started less than 5 minutes ago, set wasStarted to false as it could not do so properly
  if (Date.now() - game.startedAt <= 300000)
  {
    game.wasStarted = false;
  }

  //this error string is pretty explicit and informative so send it as is
  sendWarning(game, errStr);
}

function handleMapImgNotFound(game, errStr)
{
  //if game started less than 5 minutes ago, set wasStarted to false as it could not do so properly
  if (Date.now() - game.startedAt <= 300000)
  {
    game.wasStarted = false;
  }

  sendWarning(game, `Dominions reported an error: One or more of the image files of the selected map could not be found. Make sure they've been uploaded and that the .map file points to the proper names.`);
}

function handleThroneInCapital(game, errStr)
{
  //if game started less than 5 minutes ago, set wasStarted to false as it could not do so properly
  if (Date.now() - game.startedAt <= 300000)
  {
    game.wasStarted = false;
  }

  sendWarning(game, `Dominions reported an error: A throne was probably forced to start on a player's capital. Check the pre-set starts and thrones in the .map file (original error is: bc: king has throne in capital (p43 c385 h160 vp2) [new game created])`);
}

function handleBadAiPlayer(game, errStr)
{
  sendWarning(game, `Dominions reported an error: one of the AI players has an invalid nation number.`);
}

function handleCoreDumped(game, errStr)
{
  //don't send error here as this comes coupled with other more explicit errors
}

function handleVersionTooOld(game, errStr)
{
  sendWarning(game, `The game has crashed because a new Dominions version is available. Please be patient while the admins update the servers :)`);
}

function handleItemForgingErr(game, errStr)
{
  sendWarning(game, `The game has crashed on turn generation due to an error caused by forging a bad item. This should theoretically not happen.`);
}

function handleFileCreationErr(game, errStr)
{
  
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
}
