
const fs = require("fs");
const emitter = require("./emitter.js");
const rw = require("./reader_writer.js");

module.exports.start = function()
{
  setTimeout(update, msToNextSecond());
};

function msToNextHour()
{
  var d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  d.setSeconds(0);

  return d.getTime() - Date.now();
}

function msToNextMinute()
{
  var d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  d.setSeconds(0);
  return d.getTime() - Date.now();
}

function msToNextSecond()
{
  var d = new Date();
  d.setSeconds(d.getSeconds() + 1);
  return d.getTime() - Date.now();
}

function update()
{
  var d = new Date();

  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0)
  {
    emitter.emit("day");
  }

  if (d.getMinutes() === 0 && d.getSeconds() === 0)
  {
    emitter.emit("hour");
  }

  if (d.getMinutes() % 5 === 0 && d.getSeconds() === 0)
  {
    emitter.emit("5 minutes");
  }

  if (d.getSeconds() === 0)
  {
    emitter.emit("minute");
  }

  if (d.getSeconds() % 5 === 0)
  {
    emitter.emit("5 seconds");
  }

  //emitter.emit("second");

  setTimeout(update, msToNextSecond());
}
