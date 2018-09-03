const cheerio = require("cheerio"),
  req = require("request-promise-native"),
  req2 = require("request"),
  fs = require("fs"),
  Agent = require("agentkeepalive").HttpsAgent,
  FormData = require("form-data"),
  streamlength = require("stream-length");

const NUCLEUSROOT = "https://nucleus.church";
const ENDPOINTS = {
  upload: {
    audio: "/admin/media/add-new", //You'll get back a JSON object with the location of the edit form which will include the ID of the new media item
    attachment: "/admin/media/attachment", //You'll get back a JSON object with a file entry
    image: "/admin/upload/image" //You'll get back a JSON object with a path  entry
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
    this.email = email;
    this.password = password;
  }
  async uploadAudioFile(fileSource) {
    let audioFileForm = new FormData();
    let stream = require("request")(fileSource.url);
    let srcLength = null,
      formLength = null;
    await streamlength(stream).then(len => {
      srcLength = len;
    });
    audioFileForm.append("_token", this.csrf_token, {
      knownLength: this.csrf_token.length
    });
    let test = fs.readFileSync(__dirname + "/test.mp3");
    audioFileForm.append("audiofile", stream, {
      knownLength: srcLength,
      filename: fileSource.url.substr(fileSource.url.lastIndexOf("/") + 1),
      contentType: stream.getHeader('content-type')
    });
    formLength = await new Promise(resolve => {
      audioFileForm.getLength((er, len) => {
        resolve(len);
      });
    });
    //audioFileForm.dataSize = formLength;
    let cookie = this.cookiejar.getCookieString(NUCLEUSROOT);
    let headers = Object.assign({
      "x-csrf-token": this.csrf_token,
      //"content-length": formLength,
      cookie: cookie
    });
    
    return new Promise(resolve => {
      audioFileForm.submit(
        {
          protocol: "https:",
          host: "nucleus.church",
          path: ENDPOINTS.upload.audio,
          headers: headers
        },
        (error, response) => {
          resolve(response);
        }
      );
    });
    return this.request.post(
      {
        url: NUCLEUSROOT + ENDPOINTS.upload.audio,
        formData: audioFileForm,
        headers: headers,
        preambleCRLF: true
        //postambleCRLF: true
      },
      (err, response, body) => {
        console.log("Upload got response: ");
        console.dir(response.body);
        let htmlPath = `${__dirname}/temp/upload/__${
          response.statusCode
        }__${new Date().toISOString()}.json`;
        fs.writeFileSync(htmlPath, response.body);
        console.log(
          `Response Received with status [${
            response.statusCode
          }] html written at ${htmlPath}`
        );
        return Promise.resolve(response.body);
      }
    );
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
