var Bot = require('slackbots');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));
var zomato = require('./zomato.js');
var custom = require('./custom.js');
var ordr = require('./ordr.js');
var schedule = require('node-schedule')

var providers = [zomato, custom, ordr];

var settings = {
    token: config.token,
    name: config.name,
};
var bot = new Bot(settings);

Array.prototype.randomElement = function(callback) {
   callback(this[Math.floor(Math.random() * this.length)])
}

function formatLine(record) {
    return record.name.replace(/(\r\n|\n|\r)/gm, "").trim() + " " + record.price + ",- \r\n\r\n";
}

function sendResponse(id, data, title) {

    var res = "\r\n\r\n*" + title + "*\r\n\r\n";

    if (data.length == 0) {
      var res = {
        name: "data not available"
      }
      bot.postMessage(id, res + formatLine(res));

      return;
    }

    data.forEach(function(line) {
        res = res + formatLine(line);
    });

    bot.postMessage(id, res);
}

function process(msg, id) {
    console.log('received: ' + msg);

    switch (msg) {
        case "help":
            var restaurants = "";

            providers.forEach(function(provider) {
                provider.restaurants().forEach(function(restaurant) {
                    restaurants = restaurants + " *" + restaurant + "*,";
                })
            });

            bot.postMessage(id, "I know" + restaurants.substring(0, restaurants.length - 1) + ".");
            break;

        case "all":
            providers.forEach(function (provider) {
              provider.restaurants().forEach(function (restaurant){
                var msg = restaurant
                provider.get(msg, function(data) {
                    sendResponse(id, data, provider.name(msg));
                });
              });
            });
            break;

        case "about":
            bot.postMessage(id, "Lunchbuddy bot by *Igor Kulman*.");
            break;

        default:
        // console.log(providers);
          providers.forEach(function(provider) {

            console.log(provider.handles(msg));

            if (provider.handles(msg)) {
              provider.get(msg, function(data) {
                sendResponse(id, data, provider.name(msg));
              });

              return;
            }

          });

          bot.postMessage(id, "Sorry, I do not know " + msg + ". Use *help* to see what I know.");
          break;
    }
}

function getProviderForKeyword(keyword, callback) {
  for (var i = 0; i < providers.length; ++i)  {
    if (providers[i].handles(keyword)) {
      callback(providers[i]);
    }
  }
}

bot.on('start', function() {
  console.log("bot started");
  schedule.scheduleJob('*/5 * * * *', function() {
    console.log('job run');
  });
  schedule.scheduleJob('0 0 11 *  * 1-5', function() {
    var restaurants = []
      for (var i = 0; i < providers.length; ++i) {
        restaurants = restaurants.concat(providers[i].restaurants())
      }
      restaurants.randomElement(function(restaurant) {
        getProviderForKeyword(restaurant, function(provider) {
          provider.get(restaurant, function(data) {
            bot.postMessageToChannel('random',
            // bot.postMessageToUser('USERNME',
              "Hi, it's *lunch time*. Why don't you try something new today. Look at:" + formatResponse(data, provider.name(restaurant)))
          });
        });
      });
    });
});

bot.on('', function() {
  bot.postMessageToChannel('random',
        "Hi, it's *lunch time*. Why don't you try something new today. Look at:" + formatResponse(data, provider.name(restaurant)));
});

bot.on('message', function(data) {
  // console.log(data);
    // all ingoing events https://api.slack.com/rtm
    if (data.type == "message" && data.text.startsWith('<@' + bot.self.id + '>:')) {
        var msg = data.text.replace('<@' + bot.self.id + '>: ', '');
        // console.log('1');
        process(msg, data.channel);
    }

    if (data.type == "message" && data.channel.startsWith('D') && !data.bot_id) {
      // console.log('2');
        process(data.text, data.channel);
    }

});
