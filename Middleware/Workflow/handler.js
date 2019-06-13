'use strict';
const https = require('https');

// Version 1
// Possible Upgrades
// Pull in Sunshine Events into Connect.User.events
// Filter out profiels with no name or email (should we be sending those?)
// API endpoint to trigger update, or turn on / off automatic updates or set time period
// Templatize the transform
// Figure out way to only sync if something changes, right now always sending everything


// Connect outbound module
// https://developer.zendesk.com/embeddables/docs/connect/node
const connectPrivateKey = process.env.connectPrivateKey;
const outbound = require('outbound');
const ob = new outbound(connectPrivateKey);

// Pull in environmental variables as globals
const apiToken = process.env.apiToken;
const subDomain = process.env.subDomain;
const user = process.env.user;
const zendeskHost = subDomain + '.zendesk.com';

// Base 64 encode user and apiToken  - format {email_address}/token:{api_token}
// https://developer.zendesk.com/rest_api/docs/support/introduction#api-token
const userToken = user + '/token:' + apiToken;
const encodedUserToken = Buffer.from(userToken).toString('base64');

module.exports.callIntegration = async (event) => {
  // MVP move all sunshine profile data into Connect, create if not existing, otherwise overwrite (for now)

  // Connect to Sunshine API end point get list of profiles
  const profiles = await getProfiles();
  //console.log ("Response: " + JSON.stringify(profiles, null, 2));  
  
  const result = await setConnectData(profiles);
  //console.log (`Connect Result: ${result}`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ok',
      input: event,
    }, null, 2),
  };  
};

async function httpsRequest(method, {body, ...options}) {
  //console.log(`body: ${body}`);
  //console.log("options: " + JSON.stringify(options, null, 2));
  return new Promise((resolve,reject) => {
      const req = https.request({
          method: method,
          port: 443,
          ...options,
      }, res => {
          const chunks = [];
          res.on('data', data => chunks.push(data))
          res.on('end', () => {
              let body = Buffer.concat(chunks);
              switch(res.headers['content-type']) {
                  case 'application/json':
                      body = JSON.parse(body);
                      break;
              };
              resolve(body);
          })
      })
      req.on('error', reject);      
      if(body) {
          req.write(body);
      }
      req.end();
  })
}

async function getProfiles() {
  // use Sunshine people end point that flattens all the attributes from various profiles
  // https://developer.zendesk.com/rest_api/docs/events-and-profiles-api/people
  const apiPath = '/api/sunshine/people';
  const method = 'GET';

  const res = await httpsRequest(method, {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: ''
  });

  console.log("Sunshine Profile Data: " + JSON.stringify(res, null, 2));
  return res;
}

async function setConnectData(userProfiles) {  
  if (userProfiles.id == 23) {  // Response for no sunshine profiles {"id": 1023, "reason": "No people for this account"}
    console.log("No Sunshine Profiles, nothing to do");
    return;
  }

  console.log("# of user Profiles to sync: " + userProfiles.data.length); 

  var user = {};
  var userAttributes = {};
  for (var i = 0; i < userProfiles.data.length; i++) {
    user = userProfiles.data[i];
    console.log("PreTransform Sunshine User #" + (i + 1) + ": " + JSON.stringify(user, null, 2));
    // Transform the Sunshine profile data into the Connect profile format
    // Note some profiles don't always have the needed connect attributes so have to check for existance first      
    userAttributes = {
      firstName: safeAssign(user.profile.attributes.First_Name),
      lastName: safeAssign(user.profile.attributes.Last_Name),
      email: safeAssign(user.profile.identifiers.email),
      phoneNumber: safeAssign(user.profile.identifiers.phone),
      attributes: safeAssign(user.profile.attributes)
    };

    console.log("PostTransform Connect User #" + (i + 1) + " - user.id: " + user.id + "\n" + JSON.stringify(userAttributes, null, 2));

    // use outbound library to add/update Connect
    // https://developer.zendesk.com/embeddables/docs/connect/users#content
    // https://developer.zendesk.com/embeddables/docs/connect/node
    await ob.identify(user.id, userAttributes).then (
      function(){ 
        //console.log("Success");   
      },
      function(err){ 
        console.log("Error: User#" + (i + 1) + ": " + err);     
      }
    );
  }
}

function safeAssign(value){
  return (value === undefined) ? '' : value;
}