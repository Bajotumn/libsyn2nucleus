const cheerio = require("cheerio"),
  req = require("request-promise-native"),
  req2 = require("request"),
  fs = require("fs"),
  Agent = require("agentkeepalive").HttpsAgent,
  FormData = require("form-data"),
  streamlength = require("stream-length"),
  getBody = require("body"),
  jsonBody = require("body/json");

const NUCLEUSROOT = "https://nucleus.church";
const ENDPOINTS = {
  upload: {
    audio: "/admin/media/add-new", //You'll get back a JSON object with the location of the edit form which will include the ID of the new media item

    attachment: "/admin/media/attachment", //You'll get back a JSON object with a file entry
    image: "/admin/upload/image" //You'll get back a JSON object with a path  entry
    /*
    ------WebKitFormBoundaryRV4obKVtqGKaqA4p
Content-Disposition: form-data; name="image"; filename="500-Instagram-Post.jpg"
Content-Type: image/jpeg


------WebKitFormBoundaryRV4obKVtqGKaqA4p--
 */
    /*
class:"success"
errors:"false"
filename:"500-Bulletin-1920x1080.jpg"
filesize:560517
message:"Image successfully uploaded!"
path:"uploads/0b8ebb785b2d0b92f0a92d67c7eaa51d3c4a40c8.jpg"
*/
  },
  edit: "/admin/media/edit",
  /*
    {
  "mediaItem": {
    "id": 1587,
    "sermon_engine_id": 244,
    "title": "God's Glory Alone | John 17:1-5, 20-26",
    "description": null,
    "published_at": "2017-10-29 21:07:34",
    "source": "uploads/340c3ea10ad1368adb3ec18969afac0322d25881.mp3",
                        5e22f7aae5a56d22013ec5cb35bcaab9d53546fb
    "artwork": "uploads/1b56789e44c9c08949f195f9727f7b1cec9825dd.jpg",
    "deleted_at": null,
    "created_at": "2018-09-03 20:38:39",
    "updated_at": "2018-09-03 20:38:39",
    "filename": "102917Mosaic.mp3",
    "file_size": 34601857,
    "slug": null,
    "source_type": "hosted-audio",
    "scriptures": [
      {
        "bible_version_id": 13,
        "bible_book_id": 43,
        "chapter": "17",
        "verses": "1-5"
      },
      {
        "bible_version_id": 13,
        "bible_book_id": 43,
        "chapter": "17",
        "verses": "20-26"
      }
    ],
    "files": [],
    "tags": [],
    "speakers": ["Adam Viramontes"],
    "podcasts": [],
    "added_to_podcast": false
  }
}
    */
  playlist: {
    new: "/admin/playlists/add-new", //302 redirect on success?
    /*
    {"playlist":{"title":"500","description":"","artwork":"uploads/0b8ebb785b2d0b92f0a92d67c7eaa51d3c4a40c8.jpg"}}
     */
    items: "/admin/playlist/:id/media-items"
    /*
    {"mediaItems":[{"id":1587}]}
    */
  }
};
class nucleus {
  constructor(email, password) {
    this.agent = new Agent({ keepAliveMsecs: 3000 });
    this.cookiejar = req2.jar();
    this.request2 = req2.defaults({
      jar: this.cookiejar,
      agent: this.agent
    });
    this.request = req.defaults({
      jar: this.cookiejar,
      agent: this.agent,
      resolveWithFullResponse: true
    });
    this.request.debug = true;
    this.request2.debug = true;
    this.email = email;
    this.password = password;
  }
  /*
    {
  "mediaItem": {
    "id": 1587,
    "sermon_engine_id": 244,
    "title": "God's Glory Alone | John 17:1-5, 20-26",
    "description": null,
    "published_at": "2017-10-29 21:07:34",
    "source": "uploads/340c3ea10ad1368adb3ec18969afac0322d25881.mp3",
                        5e22f7aae5a56d22013ec5cb35bcaab9d53546fb
    "artwork": "uploads/1b56789e44c9c08949f195f9727f7b1cec9825dd.jpg",
    "deleted_at": null,
    "created_at": "2018-09-03 20:38:39",
    "updated_at": "2018-09-03 20:38:39",
    "filename": "102917Mosaic.mp3",
    "file_size": 34601857,
    "slug": null,
    "source_type": "hosted-audio",
    "scriptures": [
      {
        "bible_version_id": 13,
        "bible_book_id": 43,
        "chapter": "17",
        "verses": "1-5"
      },
      {
        "bible_version_id": 13,
        "bible_book_id": 43,
        "chapter": "17",
        "verses": "20-26"
      }
    ],
    "files": [],
    "tags": [],
    "speakers": ["Adam Viramontes"],
    "podcasts": [],
    "added_to_podcast": false
  }
}
    */
  async getCSRFToken(url) {
    return new Promise(resolve => {
      this.request2.get(url, function(err, res, body) {
        if (res.statusCode === 200) {
          if (body.length > 4) {
            let $ = cheerio.load(body);
            let tkn = $('meta[name="csrf-token"]').attr("content");
            console.log(`Got token (${tkn}) from ${url}`);
            resolve(tkn);
          }
        }
      });
    });
  }
  async editItem(itemID, sourceObj, imageID) {
    //let pubDate = new Date(sourceObj.release_date).toISOString().match(/([\d]{4}-[\d]{2}-[\d]{2})/)[0] + " 12:00:00";
    return new Promise((resolve, reject) => {
      this.request2.post(
        NUCLEUSROOT + ENDPOINTS.edit,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json;charset=UTF-8",
            Connection: "Keep-Alive",
            origin: NUCLEUSROOT,
            referer: NUCLEUSROOT + "/admin/media/edit",
            "cache-control": "no-cache",
            accept: "application/json",
            "x-csrf-token": this.csrf_token
          },
          json: true,
          body: {
            mediaItem: {
              id: sourceObj.nucleusID, //"1916"
              sermon_engine_id: this.sermonEngineID,
              title: sourceObj.title, //"God's Glory Alone | John 17:1-5, 20-26"
              description: sourceObj.description || "", //"God's Glory Alone | John 17:1-5, 20-26 "
              published_at: sourceObj.date, //"2017-10-29 01:00:00",
              artwork: sourceObj.imageID, //uploads/ad2dda70df208b611a22891458df1010b1fd6954.jpg
              scriptures: sourceObj.scriptures,
              speakers: ["Adam Viramontes"],
              added_to_podcast: false,
              files: [],
              tags: []
            }
          }
        },
        function(err, res, body) {
          if (res.statusCode === 200) {
            resolve(body);
          } else {
            reject(res.statusCode + "|" + res.statusMessage);
          }
        }
      );
    });
  }
  async uploadAudioFile(fileSource) {
    return this._postFormData(fileSource, "audiofile", ENDPOINTS.upload.audio).then(body => {
      return JSON.parse(body);
    });
  }
  async uploadImage(imageSource) {
    if (imageSource.imageID) {
      //It's king of janky, but it works to just upload NEW images
      console.log(`${imageSource.artwork} => ${imageSource.imageID}`);
      return new Promise(resolve => {
        resolve({ path: imageSource.imageID });
      });
    } else {
      let newImageSource = await this.getRedirectUrl(imageSource.artwork);
      return this._postFormData(newImageSource, "image", ENDPOINTS.upload.image).then(body => {
        return JSON.parse(body);
      });
    }
  }
  addPlaylist(name, artwork, description) {
    return this.uploadImage(artwork).then(img => {
      return this.request.post(NUCLEUSROOT + ENDPOINTS.playlist.new, {
        method: "POST",
        followAllRedirects: true,
        headers: {
          "Content-type": "application/json;charset=UTF-8",
          Connection: "Keep-Alive",
          origin: NUCLEUSROOT,
          referer: NUCLEUSROOT + ENDPOINTS.playlist.new,
          accept: "*/*",
          "x-csrf-token": this.csrf_token
        },
        json: true,
        body: {
          playlist: {
            title: name,
            description: description,
            artwork: img.path
          }
        }
      });
    });
  }
  addItemsToPlaylist(playlistID, episodeIDs) {
    //{"mediaItems":[{"id":1587}]}
    let idObj = episodeIDs.map(id => {
      return { id: id };
    });
    let endpoint = NUCLEUSROOT + ENDPOINTS.playlist.items.replace(":id", playlistID);
    return new Promise((resolve, reject) => {
      this.request2.post(
        endpoint,
        {
          method: "POST",
          followAllRedirects: true,
          headers: {
            "Content-type": "application/json",
            Connection: "Keep-Alive",
            origin: NUCLEUSROOT,
            referer: endpoint,
            "cache-control": "no-cache",
            accept: "*/*",
            "x-csrf-token": this.csrf_token
          },
          json: true,
          body: {
            mediaItems: idObj
          }
        },
        (err, response, body) => {
          if (err) {
            reject(err);
          } else {
            resolve(body);
          }
        }
      );
    });
  }
  getRedirectUrl(url) {
    return new Promise(resolve => {
      req2.get(url, function(err, res, body) {
        if (url !== res.request.uri.href) {
          console.log(`${url} => ${res.request.uri.href}`);
        }
        resolve(res.request.uri.href);
      });
    });
  }
  /**
   *
   * @param {string} sourceURL Object containing the fileSource (needs url property)
   * @param {string} formName Name from multipart form header
   * @param {ENDPOINTS.upload} endpoint Endpoint path
   * @param {object} params applyToken: add token to form, fileName: override filename, contentType: override Content-Type form header
   */
  async _postFormData(sourceURL, formName, endpoint, params) {
    //let csrfToken = await this.getCSRFToken(NUCLEUSROOT + "/admin/media"); //Possibly not necessary
    let formData = new FormData();
    let srcStream = require("request")(sourceURL, {
      followRedirect: true,
      followAllRedirects: true
    });
    let srcLength = null;

    params = params || {};
    let applyToken = params.applyToken || false,
      fileName = params.fileName || sourceURL.substr(sourceURL.lastIndexOf("/") + 1),
      contentType = params.contentType || srcStream.getHeader("content-type");

    try {
      await streamlength(srcStream).then(len => {
        srcLength = len;
      });
    } catch (e) {
      console.error(e);
    }
    if (applyToken) {
      formData.append("_token", this.csrf_token, {
        knownLength: this.csrf_token.length
      });
    }

    let frmOpts = { filename: fileName, contentType: contentType };
    if (srcLength) {
      frmOpts.knownLength = srcLength;
    }
    formData.append(formName, srcStream, frmOpts);

    let cookie = this.cookiejar.getCookieString(NUCLEUSROOT);
    let headers = Object.assign({
      referer: NUCLEUSROOT + endpoint,
      "x-csrf-token": this.csrf_token,
      cookie: cookie
    });

    console.dir(`Processing formData...${sourceURL} formName: ${formName} endPoint: ${endpoint}`);
    return new Promise((resolve, reject) => {
      formData.submit(
        {
          agent: this.agent,

          protocol: "https:",
          host: "nucleus.church",
          path: endpoint,
          headers: headers
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            getBody(response, (err, body) => {
              if (err) {
                reject(err);
              }
              resolve(body);
            });
          }
        }
      );
    });
  }
  login() {
    return this._getAuthenticationOptions().then(authOpts => {
      this.csrf_token = authOpts.token;
      let form = `_token=${authOpts.token}&email=${this.email}&password=${this.password}`;
      return this.request(authOpts.url, {
        method: "POST",
        followAllRedirects: true,
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
          Connection: "Keep-Alive",
          origin: NUCLEUSROOT,
          referer: NUCLEUSROOT + "/user/login",
          "cache-control": "no-cache",
          accept: "*/*"
        },
        body: form
      }).then(async response => {
        if (response.statusCode === 302 || response.statusCode === 200) {
          //302 redirect means login succeded
          let $ = cheerio.load(response.body);
          if (!$("form#existing_user").html()) {
            console.log("Logged in successfully...");
            this.sermonEngineID = await this.getSermonEngineId();
            return Promise.resolve(true);
          } else {
            console.log("Login failed!");
            return Promise.resolve(false);
          }
        } else {
          return Promise.resolve(false);
        }
      });
    });
  }
  async getSermonEngineId() {
    const regex = /sermon_engine_id&quot;:([\d]+),/gm;
    let id = await this.request(NUCLEUSROOT + "/admin/media").then(resp => {
      let matches = regex.exec(resp.body);
      return Promise.resolve(matches[1]);
    });
    return id;
  }
  _getAuthenticationOptions() {
    return this.request(NUCLEUSROOT + "/user/login", {
      headers: { Connection: "Keep-Alive" },
      method: "GET"
    }).then(response => {
      if (response.statusCode === 200) {
        if (response.body.length > 4) {
          let $ = cheerio.load(response.body);
          let token = $("form#existing_user input[name=_token]").val();
          let url = $("form#existing_user").attr("action");

          return Promise.resolve({ url: url, token: token });
        }
      }
    });
  }
}
module.exports = nucleus;
