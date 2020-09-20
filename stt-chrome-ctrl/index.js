const puppeteer = require('puppeteer');
//const prettier = require('prettier');
const atob = require('atob');
const btoa = require('btoa');
var fs = require('fs');

// Set to true to print some debug information.
var debug = false;

const facebooksec = require(process.env.HOME + '/.facebook-secret.json');

const scriptUrlPatterns = [
  'https://stt.disruptorbeam.com/*'
]

if (debug) {
  console.log(facebooksec.login);
}

// Get parameters of script:
args = process.argv;
args.shift();
args.shift();
if (debug) {
  console.log(args);
}

function writeFile(filename, data) {
  fs.writeFile(filename, data, function (err, data) {
    if (err) {
      console.log(err);
    }
  });
}

function modify_json(data) {
  if (data.player) {
    if (data.player.environment) {
      if (debug) {
        console.log(data.player.environment);
      }
      // disable annoying offer popup:
      data.player.environment.force_offer_popup_at_login = false;
      data.player.environment.limited_time_offers_v2.enabled = false;
      data.player.environment.limited_time_offers_v2.force_popup_at_login = false;

      // Use new event panel
      data.player.environment.use_events_v2_event_hub = true;

      //data.player.environment.use_v2_activities_panel = false;
      //data.player.environment.use_v2_ship_panel = false;
    }
  }

  return data;
}

function save_request(name, request, bodyData) {
  // Log request
  if (debug) {
    console.log(request);
  }

  // Save request
  writeFile(name + "-rq.json", JSON.stringify(request));
  writeFile(name + ".json", bodyData);
}

function modify_request(request, bodyData) {
  try {
    var data = JSON.parse(bodyData);

    data = modify_json(data);

    return JSON.stringify(data);
  } catch(e) {
    console.log(`Failed to modify request: ${e}`);
    return bodyData;
  }
}

function check_request(request, responseHeaders, bodyData)
{
  if (debug) {
    console.log("responseHeaders");
    console.log(responseHeaders);
  }

  const contentTypeHeader = Object.keys(responseHeaders).find(k => responseHeaders[k].name.toLowerCase() === 'content-type');
  let contentType = responseHeaders[contentTypeHeader].value;

  if (debug) {
    console.log("contentType");
    console.log(contentType);
  }

  if (request.url.startsWith("https://stt.disruptorbeam.com/player?")) {
    save_request("player", request, bodyData);
  } else if (request.url.startsWith("https://stt.disruptorbeam.com/config?")) {
    save_request("config", request, bodyData);
  }

  if (contentType.toLowerCase().startsWith("application/json")) {
    bodyData = modify_request(request, bodyData);
  }
  return bodyData;
}

async function interceptRequestsForTarget(target) {
  const client = await target.createCDPSession();

  try {
    await client.send('Fetch.enable', { 
      patterns: scriptUrlPatterns.map(pattern => ({
        urlPattern: pattern, requestStage: 'Response'
      }))
    });

    client.on('Fetch.requestPaused', async event => {
      const { requestId, resourceType, request, responseStatusCode, responseHeaders } = event;
      if (debug) {
        console.log(`request ${request.url} { requestId: ${requestId}, resourceType: ${resourceType}, responseStatusCode: ${responseStatusCode} }`);
      } else {
        console.log(request.url + " " + responseStatusCode);
      }
      if (responseStatusCode === 200) {
        if (debug) {
          console.log(`Handling requestId ${requestId}`);
	}
        const response = await client.send('Fetch.getResponseBody',{ requestId });
        //console.log(response);

        const contentTypeHeader = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'content-type');
        let newBody, contentType = responseHeaders[contentTypeHeader];

        const bodyData = response.base64Encoded ? atob(response.body) : response.body;

        if (debug) {
          console.log("bodyData");
          console.log(bodyData);
	}
        newBody = check_request(request, responseHeaders, bodyData);

        if (debug) {
	  console.log("newBody");
	  console.log(newBody);
	}

        client.send('Fetch.fulfillRequest', {
          requestId: requestId,
	  responseCode: responseStatusCode,
	  responseHeaders: responseHeaders,
          body: btoa(newBody)
        });
        //client.send('Fetch.continueRequest', { requestId });
      } else {
        client.send('Fetch.continueRequest', { requestId });
      }
    });
  } catch(e) {
    console.log(`Failed to setup Fetch: ${e}`);
  }
}

(async function main(){
  let facebookLogin = 0;

  let browser;

  browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    //devtools: true,
    defaultViewport: null
  }).catch(function (error) {
    console.log(error);

    console.log("Please start google chrome with:");
    console.log("google-chrome --remote-debugging-port=9222");

    facebookLogin = 1;
  });

  if (facebookLogin === 1) {
    console.log("Starting browser...");
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      //devtools: true,
      args: args
    });
  }

  const page = (await browser.pages())[0];

  await interceptRequestsForTarget(page.target());

  browser.on('targetcreated', async (target) => {
    await interceptRequestsForTarget(target);
  })

  //const url = "chrome://version";

  //await page.goto(url);

  if (facebookLogin === 1) {
    await page.goto('https://facebook.com');
    await page.type('#email', facebooksec.login);
    await page.type('#pass', facebooksec.password);

    await page.click('[type="submit"]');
    await page.waitForNavigation();

    await page.goto("https://stt.disruptorbeam.com/users/auth/facebook");
    //await page.goto("https://stt.disruptorbeam.com/users/auth/dbid");
  } else {
    await page.goto("https://stt.disruptorbeam.com");
  }

})()
