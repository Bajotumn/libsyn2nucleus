/**
 * 1) Categories =  mosaicabq.libsyn.com/website > .widget-categories > ul > li*
 * 2) Category JSON = while(http://mosaicabq.libsyn.com/page/${i}/category/${category}/render-type/json != null) +=
 * 3) foreach (category in categories) {foreach (item in category) {create sermon series; download/stream to nucleus; add image; set information; }}
 */

/**
 **    item_title: "New World | Revelation 21:1-8",
 **    release_date: "Feb 19, 2017",
 **    item_body_clean: "Heaven will always be a boring and pointless place until Jesus becomes a bright and priceless prize to you. ",
 **    image_url: "http://assets.libsyn.com/content/16270964",
 **    primary_content: {
 **                    url: "http://traffic.libsyn.com/mosaicabq/New_World___Revelation_21_1-82-19-2017.mp3?dest-id=549729",
 **    }
 */

//[].concat.apply([], [array1, array2, ...])
const cheerio = require("cheerio"),
  request = require("sync-request"),
  fs = require("fs"),
  readline = require("readline-sync"),
  nucleus = require("./nucleus.js"),
  bible = require("chapter-and-verse");

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
      for(series in database){
        if (!database[series].artwork) {
          artworklessCount++;
        }
      }
      if (artworklessCount) {
        let addArtwork = true;
        try{
          addArtwork = readline.keyInYN(`There are ${artworklessCount} series without artwork. Add some now? `)
        }catch(e){}
        if (addArtwork) {
          for(series in database){
            if (!database[series].artwork) {
              let catUrl = "";
              let urlWorks = true;
              do {
                let skipped = false;
                skipped = (catUrl = readline.question(`Enter url (or blank) for "${series}": `, {
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
    } //endif(database)
  } //endif(beginConnect())
  /*
  console.log("Let's log you into Nucleus. ***(YOUR INFORMATION IS NEVER SAVED TO DISK)***");
  let username, password;
  if (fs.existsSync(__dirname + "/auth.cfg")) {
    let auth = fs.readFileSync(__dirname + "/auth.cfg").toString();
    console.log("Loaded dev username/password from ./auth.cfg");
    auth = auth.split("\n");
    username = auth[0];
    password = auth[1];
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
  nucleusApi.login().then(loggedIn => {
    if (!loggedIn) {
      process.exit();
    }
    let testSource = {
      item_title: "Christ Alone | John 14:1-14",
      release_date: "Oct 15, 2017",
      item_body_clean: "Christ Alone | John 14:1-14 ",
      item_body: "<p>Christ Alone | John 14:1-14</p>\n",
      image_url: "https://assets.libsyn.com/secure/content/17310625",
      url: "http://traffic.libsyn.com/preview/mosaicabq/101517-_Mosaic.mp3"
    };
    /*
    nucleusApi
      .editItem(
        2076,
        testSource,
        "uploads/b10b15f770de512fb7533cf8c16cf56640e56bd7.jpg"
      )
      .then(response => {
        console.dir("Response from media edit", response);
      })
      .catch(err => {
        console.error(err);
      });
      */
  /*
                 nucleusApi
                   .uploadAudioFile(testSource.url)
                   .then(abody => {
                     console.log("Upload got response: ");
                     console.dir(abody);
                     let itemID = abody.location.match(
                       /\/admin\/media\/edit\/([\d]+)/
                     )[1];
                     let imageID = "";
                     nucleusApi
                       .uploadImage(testSource.image_url)
                       .then(ibody => {
                         imageID = ibody.path;
                         console.log(`imageID: ${imageID}`);
                         nucleusApi
                           .editItem(itemID, testSource, imageID)
                           .then(response => {
                             console.dir(
                               "Response from media edit",
                               response
                             );
                           })
                           .catch(err => {
                             console.error(err);
                           });
                       });
                   });
               });
*/

  /*
  let subdomain = "mosaicabq"; //readline.question('Please enter the Libsyn *subdomain* you wish to migrate\nIf your domain is mychurch.libsyn.com just enter "mychurch": ');
  console.log(`Got it! Let's migrate your sermons from ${subdomain}.libsyn.com to Nucleus`);
  let database = {};
  let databaseFile = `${__dirname}/database/${subdomain}.json`;
  let useCache = true;
  let databaseFound = false;
  try {
    databaseFound = fs.existsSync(databaseFile);
  } catch (e) {}
  if (databaseFound) {
    try {
      useCache = readline.keyInYN("Cached database found on disk. Use it? ");
    } catch (e) {}
  }
  if (useCache === false) {
    let libsynURL = `https://${subdomain}.libsyn.com/`;
    let categories = getCategories_sync(libsynURL);

    console.log(`Found ${categories.length} categories`);

    if (categories.length > 0) {
      if (readline.keyInYN(`Would you like to define artwork for these ${categories.length} categories? `)) {
        categories.forEach(category => {
          let catUrl = "";
          let urlWorks = true;
          do {
            let skipped = false;
            skipped =
              (catUrl = readline.question(`Enter url for "${category}": `, {
                limit: [
                  /(?!mailto:)(?:(?:http|https|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:(\/|\?|#)[^\s]*)?/i,
                  "",
                  null
                ],
                limitMessage: "That's not a valid url"
              })) == "";
            if (skipped) {
              console.log("Okay, no artwork for " + category);
              continue;
            }
            urlWorks = urlOk(catUrl);
            if (!urlWorks && !skipped) {
              console.log("That url didn't seem to work, please try again.");
            }
          } while (!urlWorks && !skipped);
          database[category] = { artwork: catUrl };
        });
      }
      console.time("Retrieve database from libsyn");
      categories.forEach(category => {
        database[category] = database[category] || {};
        database[category].items = getCategoryItems_sync(libsynURL, category);
      });
    } else {
      console.time("Retrieve database from libsyn");
      database = { items: getCategoryItems_sync(libsynURL, "") };
    }

    console.timeEnd("Retrieve database from libsyn");
    jsonfile.writeFileSync(databaseFile, database);
  } else {
    database = jsonfile.readFileSync(databaseFile);
    for (var series in database) {
      for (var item in database[series].items) {
        console.log(database[series].items[item].item_title);
      }
    }
  }*/
  //});
})();
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
function getCategoryItems_sync(url, category) {
  let res,
    i = 1,
    body;
  let fulljson = JSON.parse("[ ]");
  do {
    res = request("GET", url + "page/" + i + "/website/category/" + category + "/render-type/json");
    if (!res.error && res.statusCode === 200) {
      body = res.getBody();
      if (body.length > 4) {
        let j = JSON.parse(body);
        j.forEach(stripAttributes);
        console.dir(j);
        fulljson.push(...j);
        i++;
      }
    }
  } while (body.length > 4);
  console.log(category, "[" + fulljson.length, "items]");
  return fulljson;
}
/*
item_id: 6427146,
premium_state: "free",
item_slug: "exodus-628-77",
item_title: "Exodus 6:28-7:7",
release_date: "Mar 25, 2018",
comment_count: 0,
item_body_clean: "Exodus 6:28-7:7 ",
item_body: "<p>Exodus 6:28-7:7</p> ",
item_body_short: "<p>Exodus 6:28-7:7</p> ",
full_item_url: "https://mosaicabq.libsyn.com/exodus-628-77",
image_content_id: 20078133,
web_image_content_id: null,
image_url: "https://assets.libsyn.com/secure/content/20078133",
primary_content: {
file_class: "audio",
content_type: "Standard",
url: "https://traffic.libsyn.com/secure/mosaicabq/32518Mosaic.mp3?dest-id=549729",
url_secure: "http://traffic.libsyn.com/preview/mosaicabq/32518Mosaic.mp3",
content_title: ""
},
player: "<iframe id="embed_6427146" title="Exodus 6:28-7:7" style="border: none" src="//html5-player.libsyn.com/embed/episode/id/6427146/height/90/theme/custom/autoplay/no/autonext/no/thumbnail/yes/preload/no/no_addthis/no/direction/forward/tdest_id/549729/render-playlist/no/custom-color/ffffff/" height="90" width="100%" scrolling="no" allowfullscreen webkitallowfullscreen mozallowfullscreen oallowfullscreen msallowfullscreen></iframe>",
extra_content: [ ],
display_download_link: true
*/
function stripAttributes(j) {
  let url = j.primary_content.url_secure;
  j.url = url;
  delete j.item_id;
  delete j.premium_state;
  delete j.item_slug;
  delete j.comment_count;
  delete j.item_body;
  delete j.item_body_short;
  delete j.full_item_url;
  delete j.image_content_id;
  delete j.web_image_content_id;
  delete j.primary_content;
  delete j.player;
  delete j.extra_content;
  delete j.display_download_link;
}
function getCategories_sync(url) {
  console.time("Retrieve categories from libsyn");
  let categories = new Array();
  let categoriesRegEx = /<a href="\/website\/category\/([^"]+)/g;
  let res = request("GET", url + "website");
  if (!res.error && res.statusCode === 200) {
    let $ = cheerio.load(res.getBody());
    let cathtml = $(".widget-categories > ul").html();
    let match;
    do {
      match = categoriesRegEx.exec(cathtml);
      if (match) {
        categories.push(match[1]);
      }
    } while (match);
  } else {
    console.log(`Error = ${res.error} code = ${res.statusCode}`);
  }
  console.timeEnd("Retrieve categories from libsyn");
  return categories;
}

async function getCategories(url) {
  let categories = new Array();
  let categoriesRegEx = /<a href="([^"]+)/g;
  request(url + "website", (error, response, body) => {
    if (!error && response.statusCode === 200) {
      let $ = cheerio.load(body);
      let cathtml = $(".widget-categories > ul").html();
      let match;
      do {
        match = categoriesRegEx.exec(cathtml);
        if (match) {
          categories.push(match[1]);
        }
      } while (match);
    } else {
      console.log(`Error = ${error} code = ${response.statusCode}`);
    }
  });
  return categories;
}
