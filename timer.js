
const rw = require("./reader_writer.js");

module.exports =
{
  create: function()
  {
    var obj =
    {
      turn: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPaused: true,

      assignNewTimer: function(timer)
      {
        if (isNaN(timer.turn) === false)
        {
          obj.turn = timer.turn;
        }

        if (isNaN(timer.days) === false)
        {
          obj.days = timer.days;
        }

        if (isNaN(timer.hours) === false)
        {
          obj.hours = timer.hours;
        }

        if (isNaN(timer.minutes) === false)
        {
          obj.minutes = timer.minutes;
        }

        if (isNaN(timer.seconds) === false)
        {
          obj.seconds = timer.seconds;
        }

        if (typeof timer.isPaused === "boolean")
        {
          obj.isPaused = timer.isPaused;
        }
      },

      getTotalHours: function()
      {
        return this.days * 24 + this.hours;
      },

      getTotalMinutes: function()
      {
        return (this.days * 24 * 60) + (this.hours * 60) + this.minutes;
      },

      getTotalSeconds: function()
      {
        return (this.days * 24 * 60 * 60) + (this.hours * 60 * 60) + (this.minutes * 60) + this.seconds;
      },

      print: function()
      {
        return module.exports.print(this);
      },

      shortPrint: function()
      {
        return module.exports.shortPrint(this);
      },

      toExeArguments: function()
      {
        var hours = this.getTotalHours();
        var minutes = this.getTotalMinutes();
        var seconds = this.getTotalSeconds();

        if (this.isPaused === true)
        {
          return [""];
        }

        if (hours <= 0 && minutes <= 0 && seconds > 0)
        {
          return ["--minutes", "1"];
        }

        else if (hours <= 0 && minutes > 0)
        {
          return ["--minutes", minutes.toString()];
        }

        else if (hours > 0)
        {
          return ["--hours", (hours + 1).toString()];
        }

        else
        {
          rw.log(null, "This timer probably has 0 hours, minutes and seconds, but is also not paused. Something's wrong: ");
          rw.log(null, this);
          return [""];
        }
      }
    };

    return obj;
  },

  reviveCurrent: function(objJSON)
  {
    var timer = this.create();

    for (var key in objJSON)
    {
      if (timer[key] != null)
      {
        timer[key] = objJSON[key];
      }
    }

    if (timer.getTotalSeconds() > 0)
    {
      timer.isPaused = false;
    }

    if (timer.isPaused === false)
    {
      //needed so that the timers don't go down by 1 hour each time the bot restarts
      timer.hours++;

      if (timer.minutes != null && timer.minutes > 60)
      {
        timer.hours = (timer.hours || 0) + Math.floor(timer.minutes / 60);
        timer.minutes = timer.minutes % 60;
      }

      if (timer.hours != null && timer.hours > 24)
      {
        timer.days = (timer.days || 0) + Math.floor(timer.hours / 24);
        timer.hours = timer.hours % 24;
      }
    }

    return timer;
  },

  revive: function(objJSON)
  {
    var timer = this.create();

    for (var key in objJSON)
    {
      if (timer[key] != null)
      {
        timer[key] = objJSON[key];
      }
    }

    if (timer.getTotalSeconds() > 0)
    {
      timer.isPaused = false;
    }

    return timer;
  },

  //Input must contain at least a digit
  createFromInput: function(input)
  {
    var timer = module.exports.create();
    var days = input.match(/\d+d(ay)?/i);
    var hours = input.match(/\d+h(our)?/i);
    var minutes = input.match(/\d+m(inute)?/i);

    if (/(\d+|\d+d(ay)?|\d+h(our)?|\d+m(inute)?)/i.test(input) === false)
    {
      rw.log(null, "The input to create a timer was incorrect: " + input);
      return null;
    }

    if (days != null && days.length > 0)
    {
      timer.days = +days[0].replace(/\D/g, "");
    }

    if (hours != null && hours.length > 0)
    {
      timer.hours = +hours[0].replace(/\D/g, "");
    }

    if (minutes != null && minutes.length > 0)
    {
      timer.minutes = +minutes[0].replace(/\D/g, "");
    }

    if (days == null && hours == null && minutes == null)
    {
      timer.hours = +input.replace(/\D/g, "");
    }

    if (timer.minutes != null && timer.minutes > 60)
    {
      timer.hours = (timer.hours || 0) + Math.floor(timer.minutes / 60);
      timer.minutes = timer.minutes % 60;
    }

    if (timer.hours != null && timer.hours > 24)
    {
      timer.days = (timer.days || 0) + Math.floor(timer.hours / 24);
      timer.hours = timer.hours % 24;
    }

    if (timer.getTotalMinutes() <= 0)
    {
      timer.isPaused = true;
    }

    else timer.isPaused = false;

    return timer;
  },

  secondsToTimer: function(seconds)
  {
    var timer = this.create();

    if (seconds <= 0)
    {
      return timer;
    }

    //86400 seconds is one day
    timer.days = Math.floor(seconds / 86400);
    seconds = (seconds - (timer.days * 86400)).lowerCap(0);

    timer.hours = Math.floor(seconds / 3600);
    seconds = (seconds - (timer.hours * 3600)).lowerCap(0);

    timer.minutes = Math.floor(seconds / 60);
    seconds = (seconds - (timer.minutes * 60)).lowerCap(0);

    timer.seconds = seconds+0;

    if (timer.getTotalSeconds() <= 0)
    {
      timer.isPaused = true;
    }

    else timer.isPaused = false;

    return timer;
  }
}

module.exports.shortPrint = function(timer)
{
  var str = "";

  if (timer.isPaused)
  {
    return "Paused";
  }

  if (timer.days < 10)
  {
    str += "0" + timer.days;
  }

  else str += timer.days;

  if (timer.hours < 10)
  {
    str += ":0" + timer.hours;
  }

  else str += ":" + timer.hours;

  if (timer.minutes < 10)
  {
    str += ":0" + timer.minutes;
  }

  else str += ":" + timer.minutes;

  if (timer.seconds < 10)
  {
    str += ":0" + timer.seconds;
  }

  else str += ":" + timer.seconds;

  return  str;
};

module.exports.print = function(timer)
{
  var str = "";

  if (timer.isPaused)
  {
    return "Paused";
  }

  if (timer.days > 0)
  {
    str += timer.days + " day(s), "
  }

  if (timer.hours > 0)
  {
    str += timer.hours + " hour(s), "
  }

  if (timer.minutes > 0)
  {
    str += timer.minutes + " minute(s), "
  }

  if (timer.seconds > 0)
  {
    str += timer.seconds + " second(s)"
  }

  str = str.replace(/\,\s*$/, "");

  return  str;
};
