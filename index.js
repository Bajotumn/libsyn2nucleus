const cheerio = require("cheerio"),
  request = require("sync-request"),
  fs = require("fs"),
  readline = require("readline-sync"),
  nucleus = require("./nucleus.js");
var dbSource = null;
(async () => {
  let availablePlugins = loadSourcePlugins();
  let pluginSelection = 0; //readline.keyInSelect(availablePlugins.map(p=>{return p.name}), "Which source plugin? ");
  if (pluginSelection !== undefined) {
    console.log(`Source set to ${availablePlugins[pluginSelection]}`);
    dbSource = new (require(availablePlugins[pluginSelection].path))();
  }
  if (dbSource.beginConnect()) {
    let database = dbSource.getDatabase();
    if (database) {
      let artworklessCount = 0;
      for (series in database) {
        if (!database[series].artwork) {
          artworklessCount++;
        }
      }
      if (artworklessCount) {
        let addArtwork = false;
        try {
          addArtwork = readline.keyInYN(`There are ${artworklessCount} series without artwork. Add some now? `);
        } catch (e) {}
        if (addArtwork) {
          for (series in database) {
            if (!database[series].artwork) {
              let catUrl = "";
              let urlWorks = true;
              do {
                let skipped = false;
                skipped =
                  (catUrl = readline.question(`Enter url (or blank) for "${series}": `, {
                    limit: [
                      /(?!mailto:)(?:(?:http|https|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:(\/|\?|#)[^\s]*)?/i,
                      "",
                      null
                    ],
                    limitMessage: "That's not a valid url"
                  })) == "";
                if (skipped) {
                  console.log("Okay, no artwork for " + series);
                  continue;
                }
                urlWorks = urlOk(catUrl);
                if (!urlWorks && !skipped) {
                  console.log("That url didn't seem to work, please try again.");
                }
              } while (!urlWorks && !skipped);
              database[series].artwork = catUrl;
            }
          }
        }
      } //endif(artworklessCount)
      dbSource.saveDB(database);

      console.log("Let's log you into Nucleus. ***(YOUR INFORMATION IS NEVER SAVED TO DISK)***");
      let username, password;
      if (fs.existsSync(__dirname + "/auth.cfg")) {
        let auth = fs.readFileSync(__dirname + "/auth.cfg").toString();
        console.log("Loaded dev username/password from ./auth.cfg");
        auth = auth.split("\n");
        username = auth[0].trim();
        password = auth[1].trim();
      } else {
        try {
          username = readline.questionEMail("Email: ");
          password = readline.question(`Password for "${username}": `, {
            hideEchoBack: true
          });
        } catch (error) {
          console.error(error);
        }
      }

      let nucleusApi = new nucleus(username, password);
      nucleusApi.login().then(async loggedIn => {
        if (!loggedIn) {
          process.exit();
        }

        for (series in database) {
          let uploadIDs = [];
          //await database[series].items.forEach(async item => {
          for (item in database[series].items) {
            if (!database[series].items[item].nucleusID || !database[series].items[item].editComplete) {
              //Work on this later to allow for failures in edit stage
              let result = await nucleusApi.uploadAudioFile(database[series].items[item]).then(abody => {
                let itemID = abody.location.match(/\/admin\/media\/edit\/([\d]+)/)[1];
                database[series].items[item].nucleusID = itemID; //We'll check this in future runs to make sure we don't reupload audio
                let imageID = "";
                return nucleusApi.uploadImage(database[series].items[item]).then(ibody => {
                  imageID = ibody.path;
                  database[series].items[item].imageID = imageID; //We'll check this in future runs to make sure we don't reupload image
                  /**
                   * This is gonna be messy...
                   */
                  for (other in database[series].items) {
                    if (database[series].items[other].artwork === database[series].items[item].artwork && !database[series].items[other].imageID) {
                      database[series].items[other].imageID = imageID; //We'll check this in future runs to make sure we don't reupload image
                    }
                  }
                  return nucleusApi
                    .editItem(itemID, database[series].items[item], imageID)
                    .then(response => {
                      console.log(database[series].items[item].title + " finished!");
                      uploadIDs.push(itemID);
                      database[series].items[item].editComplete = true; //We'll check this in future runs to make sure we don't reedit episodes
                      return Promise.resolve(true);
                    })
                    .catch(err => {
                      console.error(err);
                      database[series].items[item].editComplete = false;
                      return Promise.reject(err);
                    });
                });
              });
            } else {
              uploadIDs.push(database[series].items[item].nucleusID);
            }
            dbSource.saveDB(database);
          } //); //end items foreach
          if (!database[series].playlistId && !database[series].itemsAdded)
            nucleusApi.addPlaylist(series, database[series].artwork, database[series].description).then(response => {
              let playlistId = response.body.location.match(/[\d]+/g)[0];
              database[series].playlistId = playlistId;
              nucleusApi.addItemsToPlaylist(playlistId, uploadIDs).then(response => {
                console.log(response);
                database[series].itemsAdded = uploadIDs;
              });
            });
          dbSource.saveDB(database); //Save after successful series
        } //end for series in db
        dbSource.saveDB(database);
      }); //End nucleus login promise chain
    } //endif(database)
  } //endif(beginConnect())
})().catch(e => {
  console.error(e);
});
function loadSourcePlugins() {
  let src = fs.readdirSync(__dirname + "/plugins");
  let plugins = src.map(p => {
    return {
      name: p.substr(0, p.length - 3),
      path: __dirname + "/plugins/" + p
    };
  });
  return plugins;
}
function urlOk(url) {
  let res = request("GET", url);
  return res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 301;
}
