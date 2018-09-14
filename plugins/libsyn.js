/**
 * Source plugins should implement the following interfaces
 *
 * beginConnect() : boolean
 * Should initialize your object with some user input (see libsyn plugin)
 * returns true if connection is valid
 * returns false otherwise
 *
 * getDatabase() which should return a JSON object
 * with the structure shown below
 *
 * if there is a cached database on disk and user wants to use it,
 * it should be returned here.
 *
 * {
 * "SERIES NAME": {
 *   "artwork": "FULL URL TO SERMON SERIES ARTWORK", //This can be added later if it is not part of your source structure
 *   "items": [
 *     {
 *       "title": "Episode Title",
 *       "date": "Episode Date", //2017-10-29 01:00:00
 *       //This code works well to properly format the date object
 *       //let pubDate = new Date(release_date).toISOString().match(/([\d]{4}-[\d]{2}-[\d]{2})/)[0] + " 12:00:00";
 *       "item_body_clean": "Plain text item description",
 *       "image_url": "URL to episode artwork", //A redirection to an image should be okay
 *       "url": "URL to episode audio"
 *       "speakers":["Speaker1","Speaker2"]
 *       "scriptures": [
 *                         {
 *                           "bible_version_id": 13,
 *                           "bible_book_id": 43,
 *                           "chapter": "17",
 *                           "verses": "1-5"
 *                         },
 *                         {
 *                           "bible_version_id": 13,
 *                           "bible_book_id": 43,
 *                           "chapter": "17",
 *                           "verses": "20-26"
 *                         }
 *                       ],
 *     }
 *   }
 *
 * If there is any user input required it should be done in constructor().
 */

const cheerio = require("cheerio"),
  request = require("sync-request"),
  fs = require("fs"),
  jsonfile = require("jsonfile"),
  readline = require("readline-sync");

class libsyn {
  /* Interface implementation */
  beginConnect() {
    this.subdomain = "mosaicabq"; //readline.question('Please enter the Libsyn *this.subdomain* you wish to migrate\nIf your domain is mychurch.libsyn.com just enter "mychurch": ');

    if (checkSubdomainExistance(this.subdomain)) {
      console.log(`Got it! Let's migrate your sermons from ${this.subdomain}.libsyn.com to Nucleus`);
      this.databaseFile = `${__dirname}/../database/libsyn.${this.subdomain}.json`;
      return true;
    }
    console.log("Looks like that subdomain doesn't exist.");
    return false;
  }
  getDatabase() {
    let database = {};

    let useCache = true;
    let databaseFound = false;
    try {
      databaseFound = fs.existsSync(this.databaseFile);
    } catch (e) {}
    if (databaseFound) {
      try {
        useCache = readline.keyInYN("Cached database found on disk. Use it? ");
      } catch (e) {
        console.error(e);
      }
    }
    if (useCache === false) {
      let libsynURL = `https://${this.subdomain}.libsyn.com/`;
      let categories = getCategories_sync(libsynURL);

      console.log(`Found ${categories.length} categories`);

      if (categories.length > 0) {
        console.time("Retrieve database from libsyn");
        categories.forEach(category => {
          database[category] = {
            artwork: null,
            description: null,
            items: getCategoryItems_sync(libsynURL, category)
          };
        });
      } else {
        console.time("Retrieve database from libsyn");
        database = { items: getCategoryItems_sync(libsynURL, "") };
      }
      console.timeEnd("Retrieve database from libsyn");
    } else {
      database = jsonfile.readFileSync(this.databaseFile);
    }
    this.saveDB(database);
    return database;
  }
  saveDB(database) {
    jsonfile.writeFileSync(this.databaseFile, database);
  }
  /* Implementation details */
}
function checkSubdomainExistance(subdomain) {
  try {
    let res = request("GET", `https://${subdomain}.libsyn.com`);
    return !res.error && res.statusCode === 200;
  } catch (e) {}
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
function getCategoryItems_sync(url, category) {
  let res,
    i = 1,
    body;
  let jsonCategory = JSON.parse("[ ]");
  do {
    res = request("GET", url + "page/" + i + "/website" + (category ? "/category/" + category : "") + "/render-type/json");
    if (!res.error && res.statusCode === 200) {
      body = res.getBody();
      if (body.length > 4) {
        let jsonResp = JSON.parse(body);
        //j.forEach(stripAttributes);
        jsonCategory.push(...jsonResp.map(normalizeOutput));
        i++;
      }
    }
  } while (body.length > 4 && !res.error && res.statusCode === 200);
  console.log(`${category} [${jsonCategory.length} items]`);
  return jsonCategory;
}
function normalizeOutput(input) {
  let pubDate = new Date(input.release_date).toISOString().match(/([\d]{4}-[\d]{2}-[\d]{2})/)[0] + " 12:00:00";
  return {
    title: input.item_title,
    description: input.item_body_clean,
    artwork: input.image_url,
    date: pubDate,
    url: input.primary_content.url_secure
  };
}

module.exports = libsyn;
