const cheerio = require("cheerio"),
  req = require("request-promise-native"),
  req2 = require("request"),
  fs = require("fs"),
  Agent = require("agentkeepalive").HttpsAgent,
  FormData = require("form-data"),
  streamlength = require("stream-length"),
  getBody = require("body");
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
    let csrfToken = await this.getCSRFToken(
      NUCLEUSROOT + ENDPOINTS.edit + "/" + itemID + "?status=new"
    );
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
            "x-csrf-token": csrfToken
          },
          json: true,
          body: {
            /*
            mediaItem: {
              id: itemID, //"1916"
              sermon_engine_id: 244,
              title: sourceObj.item_title, //"God's Glory Alone | John 17:1-5, 20-26"
              description: sourceObj.item_body_clean, //"God's Glory Alone | John 17:1-5, 20-26 "
              published_at: "2017-10-29 21:07:34",
              artwork: imageID, //uploads/ad2dda70df208b611a22891458df1010b1fd6954.jpg
              scriptures: [
                {
                  bible_version_id: 13,
                  bible_book_id: 43,
                  chapter: "17",
                  verses: "1-5"
                },
                {
                  bible_version_id: 13,
                  bible_book_id: 43,
                  chapter: "17",
                  verses: "20-26"
                }
              ],
              speakers: ["Adam Viramontes"],
              added_to_podcast: false,
              files: [],
              tags: []
            }
            */
            id: 1916,
            sermon_engine_id: 244,
            title: "God's Glory Alone | John 17:1-5, 20-26 .",
            description: null,
            published_at: "2017-10-29 21:07:34",
            source: "uploads/340c3ea10ad1368adb3ec18969afac0322d25881.mp3",
            artwork: "uploads/1b56789e44c9c08949f195f9727f7b1cec9825dd.jpg",
            deleted_at: null,
            created_at: "2018-09-06 20:38:39",
            updated_at: "2018-09-06 20:38:39",
            filename: "102917Mosaic.mp3",
            file_size: 34601857,
            slug: null,
            source_type: "hosted-audio",
            scriptures: [
              {
                bible_version_id: 13,
                bible_book_id: 43,
                chapter: "17",
                verses: "1-5"
              },
              {
                bible_version_id: 13,
                bible_book_id: 43,
                chapter: "17",
                verses: "20-26"
              }
            ],
            files: [],
            tags: [],
            speakers: ["Adam Viramontes"],
            podcasts: [],
            added_to_podcast: false
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
  uploadAudioFile(fileSource) {
    return this._postFormData(fileSource, "audiofile", ENDPOINTS.upload.audio, {
      applyToken: true
    }).then(body => {
      return JSON.parse(body);
    });
  }
  async uploadImage(imageSource) {
    let newImageSource = await this.getRedirectUrl(imageSource);
    return this._postFormData(newImageSource, "image", ENDPOINTS.upload.image);
  }
  getRedirectUrl(url) {
    return new Promise(resolve => {
      req2.get(url, function(err, res, body) {
        console.log(`${url} => ${res.request.uri.href}`);
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
    let csrfToken = await this.getCSRFToken(
      NUCLEUSROOT + '/admin/media'
    );
    let formData = new FormData();
    let srcStream = require("request")(sourceURL, {
      followRedirect: true,
      followAllRedirects: true
    });
    let srcLength = null;

    params = params || {};
    let applyToken = params.applyToken || false,
      fileName =
        params.fileName || sourceURL.substr(sourceURL.lastIndexOf("/") + 1),
      contentType = params.contentType || srcStream.getHeader("content-type");

    await streamlength(srcStream).then(len => {
      srcLength = len;
    });
    if (applyToken) {
      formData.append("_token", this.csrf_token, {
        knownLength: this.csrf_token.length
      });
    }

    formData.append(formName, srcStream, {
      knownLength: srcLength,
      filename: fileName,
      contentType: contentType
    });

    let cookie = this.cookiejar.getCookieString(NUCLEUSROOT);
    let headers = Object.assign({
      "x-xsrf-token": this.csrf_token, //I assume this should always be included...
      "x-csrf-token": csrfToken,
      cookie: cookie
    });

    console.dir(
      `Processing formData...${sourceURL} formName: ${formName} endPoint: ${endpoint}`,
      params
    );
    return new Promise((resolve, reject) => {
      formData.submit(
        {
          protocol: "https:",
          host: "nucleus.church",
          path: endpoint,
          headers: headers
        },
        (err, response) => {
          if (err) {
            reject(err);
          }
          getBody(response, (err, body) => {
            if (err) {
              reject(err);
            }
            resolve(body);
          });
        }
      );
    });
  }
  login() {
    return this._getAuthenticationOptions().then(authOpts => {
      this.csrf_token = authOpts.token;
      let form = `_token=${authOpts.token}&email=${this.email}&password=${
        this.password
      }`;
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
      }).then(response => {
        let htmlPath = `${__dirname}/temp/__${
          response.statusCode
        }__${new Date().toISOString()}.html`;
        fs.writeFileSync(htmlPath, response.body);
        console.log(
          `Response Received with status [${
            response.statusCode
          }] html written at ${htmlPath}`
        );

        if (response.statusCode === 302 || response.statusCode === 200) {
          //302 redirect means login succeded
          let $ = cheerio.load(response.body);
          if (!$("form#existing_user").html()) {
            console.log("Logged in successfully...");
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
