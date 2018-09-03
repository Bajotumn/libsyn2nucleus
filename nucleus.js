const cheerio = require("cheerio"),
  req = require("request-promise-native"),
  fs = require("fs"),
  Agent = require("agentkeepalive").HttpsAgent;
  
class nucleus {
  constructor(email, password) {
    require("request").debug = true;
    this.agent = new Agent({ keepAliveMsecs: 3000 });
    this.request = req.defaults({ jar: true, agent: this.agent });
    this.email = email;
    this.password = password;
  }
  login() {
    return this._getAuthenticationOptions().then(authOpts => {
      let form = `_token=${authOpts.token}&email=${this.email}&password=${
        this.password
      }`;
      return this.request(authOpts.url, {
        method: "POST",
        resolveWithFullResponse: true,
        followAllRedirects: true,
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
          Connection: "Keep-Alive",
          origin: "https://nucleus.church",
          referer: "https://nucleus.church/user/login",
          "cache-control": "no-cache",
          accept: "*/*"
        },
        body: form
      }).then(response => {
        let htmlPath =`${__dirname}/temp/__${response.statusCode}__${new Date().toISOString()}.html`;
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
    return this.request("https://nucleus.church/user/login", {
      headers: { Connection: "Keep-Alive" },
      method: "GET",
      resolveWithFullResponse: true
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
