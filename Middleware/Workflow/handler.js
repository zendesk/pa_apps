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
const user_id = process.env.user_id;//'379070781172';
const zendeskHost = subDomain + '.zendesk.com';


// Base 64 encode user and apiToken  - format {email_address}/token:{api_token}
// https://developer.zendesk.com/rest_api/docs/support/introduction#api-token
const userToken = user + '/token:' + apiToken;
const encodedUserToken = Buffer.from(userToken).toString('base64');

// So that one knows what domain we are running in
console.log(`subDomain: ${subDomain}`);

module.exports.callIntegration = async (event) => {
  // MVP move all sunshine profile data into Connect, create if not existing, otherwise overwrite (for now)

  // Connect to Sunshine API end point get list of profiles
  const profiles = await getProfiles();
  //console.log ("Response: " + JSON.stringify(profiles, null, 2));  

  if (profiles.id) {  // Indicates error message
    console.log(`callIntegration().getProfiles() - Error: ${profiles.id}: ${profiles.reason}`);
    if (profiles.id == 1023) { // response for no sunshine profiles {"id": 1023, "reason": "No people for this account"}
      return {
        statusCode: 204,
        body: JSON.stringify({
          message: 'No Content',
          input: event,
        }, null, 2),
      };  
    } else { // Some other error
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Internal Server Error',
          input: event,
        }, null, 2),
      };  
    }    
  }
  
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
  console.log("Raw # of user Profiles to sync: " + userProfiles.data.length); 
  
  // Filter profiles - must have an email + user_id - also include name since sunshine 
  // has duplicate profiles and those are missing name (bug?)
  var filteredUserProfiles = userProfiles.data.filter((user) => {
    // only include profiles that have both an email and user_id and name
    return user.profile.identifiers.email && user.profile.identifiers.user_id && user.profile.name;
  });
  
  console.log("Filtered # of user Profiles to sync: " + filteredUserProfiles.length); 

  var user = {};
  var userAttributes = {};
  for (var i = 0; i < filteredUserProfiles.length; i++) {
    user = filteredUserProfiles[i];    
    console.log("PreTransform Sunshine User #" + (i + 1) + ": " + JSON.stringify(user, null, 2));
    
    // Transform the Sunshine profile data into the Connect profile format
    // Note some profiles don't always have the needed connect attributes so have to check for existance first      

    // Handle Name being populated by not First_Name and Last_Name
    const name = handleName(user.profile.attributes.First_Name, user.profile.attributes.Last_Name, user.profile.name);

    // Handle Phone Number stored in attibutes as both phone and phone_number
    const phoneNumber = handlePhone(user.profile.identifiers.phone, user.profile.identifiers.phone_number);
    
    const sunshineUserId = safeAssign(user.id);
    const supportUserId = safeAssign(user.profile.identifiers.user_id);
    const connectUserId = safeAssign(user.profile.attributes.connect_user_id);
    const userId = handleUserId(sunshineUserId, supportUserId, connectUserId);

    userAttributes = {
      firstName: name.firstName,
      lastName: name.lastName,
      email: safeAssign(user.profile.identifiers.email),
      phoneNumber: phoneNumber,
      attributes: safeAssign(user.profile.attributes)
    };

    console.log("PostTransform Connect User #" + (i + 1) + " - userId: " + userId + "\n" + JSON.stringify(userAttributes, null, 2));

    // use outbound library to add/update Connect
    // https://developer.zendesk.com/embeddables/docs/connect/users#content
    // https://developer.zendesk.com/embeddables/docs/connect/node
    await ob.identify(userId, userAttributes).then (
      function(){ 
        //console.log(`Success: ` + res);
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

function handleName (firstNameOrg, lastNameOrg, nameOrg) {
  // Handle Name being populated by not First_Name and Last_Name
  var firstName = safeAssign(firstNameOrg);
    
  if (!firstName) {
    if (nameOrg.includes(' '))
      firstName = nameOrg.split(' ')[0];  // Only get first name
    else 
      firstName = ''; // use blank since only one word
  }

  var lastName = safeAssign(lastNameOrg);
  if (!lastName) {
    if (nameOrg.includes(' '))  // Name split into first, last
      // get remaining string after firstName
      lastName = nameOrg.split(' ').splice(1).join(' ');
    else
      lastName = safeAssign(nameOrg); // user name as last name since one word
  }
  
  return {
    firstName: firstName,
    lastName: lastName
  };
}

function handlePhone (phone, phone_number)
{
  // Handle Phone Number stored in attibutes as both phone and phone_number
  var phoneNumber = safeAssign(phone);
  if (!phoneNumber)
    phoneNumber = safeAssign(phone_number);
     
  return phoneNumber;
}

function handleUserId (sunshineUserId, supportUserId, connectUserId, userEmail) {
  console.log (`SunshineUID: ${sunshineUserId}, SuportUID: ${supportUserId}, ConnectUID: ${connectUserId}`);

  // First check to see if we have a connectId and if so pass that back immediately
  if (connectUserId) {
    return connectUserId;
  }
  
  var newConnectUserId = '';
  if (userEmail) { // if no connect ID then search connect by given email
    // Search connect get connect UserId
    
  }

  if (newConnectUserId) {
    // Update Sunshine profile with connect Id

    return newConnectUserId;
  } else if (supportUserId) {  // shouldn't really get here, but handle case, return supportUserId
    return supportUserId;
  } else {  // doubly shouldn't get here but fail back to Sunshine UserId
    return sunshineUserId;
  }  
}


module.exports.createTicket = async (event) => {    
  //console.log(JSON.stringify(event, null, 2));
  // Check Params
  if (!event.headers.subject ||
      !event.headers.comment) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Bad Request',
        input: event,
      }, null, 2),
    };
  };  

  if (!event.headers.priority) event.headers.priority = 'normal';

  // Use standard Zendesk Schema - 
  // https://developer.zendesk.com/rest_api/docs/support/tickets#create-ticket
  
  var newTicket = {};
  newTicket = {
    ticket: {
      subject: safeAssign(event.headers.subject),
      comment: { "body": safeAssign(event.headers.comment) },
      priority: safeAssign(event.headers.priority),
      type: 'problem',
      requester_id: user_id
    }
  } 
  console.log(`createTicket() - newTicket: ${JSON.stringify(newTicket, null, 2)}`);

  const postData = JSON.stringify(newTicket); 
  const apiPath = '/api/v2/tickets.json';
  const method = 'POST';  
 
  const res = await httpsRequest(method, {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: postData
  });

  //console.log("Create Ticket response: " + JSON.stringify(res.toString(), null, 2));
  const createdTicket = JSON.parse(res.toString());  
  console.log(`New Ticket Id: ${createdTicket.ticket.id}`);
  console.log(`New Ticket URL: ${createdTicket.ticket.url}`);
  console.log(`New Ticket Requestor Id: ${createdTicket.ticket.requester_id}`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ok',
      //input: newTicket,
      id: createdTicket.ticket.id,
      url: createdTicket.ticket.url,
      requester_id: createdTicket.ticket.requester_id
    }, null, 2),
  };  
};

module.exports.deleteTicket = async (event) => {    
  //console.log(JSON.stringify(event, null, 2));
  // Check Params
  if (!event.headers.ticket_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Bad Request',
        input: event,
      }, null, 2),
    };
  };  
  
  // Use Zendesk API call - 
  // https://developer.zendesk.com/rest_api/docs/support/tickets#delete-ticket
  
  console.log(`deleteTicket() - ticket ID: ${event.headers.ticket_id}`);  
  const apiPath = `/api/v2/tickets/${event.headers.ticket_id}.json`;
  const method = 'DELETE';  
 
  const res = await httpsRequest(method, {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: ''
  });

  console.log("Delete Ticket response: " + JSON.stringify(res.toString(), null, 2));
  if (res.toString() === "") {    // empty string return = success
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ok',
        input: event.headers.ticket_id      
      }, null, 2),
    };  
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: 'Not Found',
        input: event.headers.ticket_id      
      }, null, 2),
    };      
  }
};

module.exports.createSunshineObject = async (event) => {
  //console.log(`createSunshineObject() - called`);
  //console.log(JSON.stringify(event, null, 2));

  if (!event.headers.objecttype)// || !event.headers.attributes)    
  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'Bad Request',
      input: event,
    }, null, 2),
  };

  //console.log(event.headers.objecttype);
  //console.log(event.headers.attributes);

  // Use Sunshine API to create object, will handle updates etc later - !!objecttype must already exist
  // https://developer.zendesk.com/rest_api/docs/sunshine/resources#create-object-record

  var newObject = {};
  newObject = {
    data: {
      type: event.headers.objecttype,      
      attributes: {//event.headers.attributes
        owner: "Lisa Smith",
        city: "Miami",
        state: "FL",
        country: "United States",
        product: "SharkION™ Robot Vacuum R85 with Wifi",
        model_number: "RV850BRN",
        health: "Poor",
        status: "Docked Charging",
        successful_missons: 0,
        recent_issue: "Charge Capacity",
        recommend: "Contact and send replacement"
      }
    }
  } 
  console.log(`createSunshineObject() - newObject: ${JSON.stringify(newObject, null, 2)}`);

  const postData = JSON.stringify(newObject); 
  const apiPath = '/api/sunshine/objects/records';
  const method = 'POST';  
 
  const res = await httpsRequest(method, {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: postData
  });

  //console.log("Create Object response: " + JSON.stringify(res.toString(), null, 2));
  const createdSunshineObject = JSON.parse(res.toString());  
  console.log(`New Object Id: ${createdSunshineObject.data.id}`);  
  //console.log(`New Object External Id: ${createdSunshineObject.data.external_id}`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ok',
      input: newObject,
      id: createdSunshineObject.data.id,
      //external_id: createdSunshineObject.data.external_id
    }, null, 2),
  };  
};

module.exports.deleteSunshineObject = async (event) => {
  //console.log(`deleteSunshineObject() - called`);
  //console.log(JSON.stringify(event, null, 2));

  if (!event.headers.object_id)
  return {
    statusCode: 400,
    body: JSON.stringify({
      message: 'Bad Request',
      input: event,
    }, null, 2),
  };

  console.log(event.headers.object_id);  

  // Use Sunshine API to delete object
  // https://developer.zendesk.com/rest_api/docs/sunshine/resources#delete-object-record
  
  const apiPath = `/api/sunshine/objects/records/${event.headers.object_id}`;
  const method = 'DELETE';  
 
  const res = await httpsRequest(method, {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: ''
  });

  console.log("Delete Object response: " + JSON.stringify(res.toString(), null, 2));
  if (res.toString() === "") {    // empty string return = success
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ok',
        input: event.headers.object_id      
      }, null, 2),
    };  
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: 'Not Found',
        input: event.headers.object_id      
      }, null, 2),
    };      
  }
};

module.exports.createSunshineEvent = async (event) => {
  //console.log(`createSunshineEvent() - called`);
  //console.log(JSON.stringify(event, null, 2));

  //console.log(`createSunshineEvent() - profile source: ${event.headers.profile_source}`);
  //console.log(`createSunshineEvent() - event source: ${event.headers.event_source}`);
  //console.log(`createSunshineEvent() - event type: ${event.headers.event_type}`);
  //console.log(`createSunshineEvent() - event description: ${event.headers.event_description}`);  
  
  if (!event.headers.profile_source || !event.headers.event_source || !event.headers.event_type || !event.headers.event_description)    
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Bad Request',
        input: event,
      }, null, 2),
  };  


  // Use Sunshine API to create event
  // https://developer.zendesk.com/rest_api/docs/sunshine/events#track-event

  //var error = 'ALL LED Lights are off';
  var error_code = 2;  

  var newEvent = {};
  newEvent = {
    profile: {
      source: event.headers.profile_source,
      identifiers: {
        user_id: user_id
      }
    },
    event:
    {
      source: event.headers.event_source,
      type: event.headers.event_type,
      description: event.headers.event_description,
      properties: {        
          //error: error,
          error_code: error_code
      }  
    }  
  } 
  console.log(`createSunshineEvent() - newEvent: ${JSON.stringify(newEvent, null, 2)}`);

  const postData = JSON.stringify(newEvent);
  const apiPath = '/api/sunshine/events';
  const method = 'POST';  
 
  const res = await httpsRequest(method, {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Content-Type": "application/json",
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: postData
  });

  // empty string return = success
  console.log("Create Event response: " + JSON.stringify(res.toString(), null, 2));  

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ok'  
    }, null, 2),
  };  
};


module.exports.getSellUsers = async (event) => {
  //console.log(`getSellUsers() - called`);
  //console.log(JSON.stringify(event, null, 2));

  // Authorization - https://developers.getbase.com/docs/rest/articles/first_call#generate-access-token
  const sellAccessToken = process.env.sellAccessToken;
  const sellDomain = 'api.getbase.com'
  const apiPath = '/v2/users';
  const method = 'GET';

  const req = {
    hostname: sellDomain,
    path: apiPath,
    headers: {
      "Accept": "application/json",
      "Authorization": 'Bearer ' + sellAccessToken,
      "User-Agent": "none"
    },
    body: ''
  }

  //console.log(`getSellUsers.req: ${JSON.stringify(req, null, 2)}`);

  // API call - https://developers.getbase.com/docs/rest/reference/users
  const res = await httpsRequest(method, req);  
  const sellUserData = JSON.parse(res.toString());
  console.log("getSellUsers() - Sell User Data: " + JSON.stringify(sellUserData, null, 2));
  // sellUserData contains a items array with a data element, the user data is under items[x].data
  // Interesting elements include id, name, email, phone_number, timezone, confirmed, role, status, team_name, group, reports_to
  // !!!TODO max results is 25 handle pagenated requests
  
  return sellUserData;
}

module.exports.getSellContacts = async (event) => {
  //console.log(`getSellContacts() - called`);
  //console.log(JSON.stringify(event, null, 2));

  // Authorization - https://developers.getbase.com/docs/rest/articles/first_call#generate-access-token
  const sellAccessToken = process.env.sellAccessToken;
  const sellDomain = 'api.getbase.com'
  const apiPath = '/v2/contacts';
  const method = 'GET';

  const req = {
    hostname: sellDomain,
    path: apiPath,
    headers: {
      "Accept": "application/json",
      "Authorization": 'Bearer ' + sellAccessToken,
      "User-Agent": "none"
    },
    body: ''
  }

  //console.log(`getSellUsers.req: ${JSON.stringify(req, null, 2)}`);

  // API call - https://developers.getbase.com/docs/rest/reference/contacts
  const res = await httpsRequest(method, req);  
  const sellContactData = JSON.parse(res.toString());
  console.log(`getSellContacts() - Sell Contact Data: ${JSON.stringify(sellContactData, null, 2)}`);  
  // sellContactData contains a items array with a data element, the contact data is under items[x].data
  // Interesting elements include id, name, description, email, phone, mobile, address, 
  // !!!TODO max results is 25 handle pagenated requests
  
  return sellContactData;
}

module.exports.getSellLeads = async (event) => {
  //console.log(`getSellLeads() - called`);
  //console.log(JSON.stringify(event, null, 2));

  // Authorization - https://developers.getbase.com/docs/rest/articles/first_call#generate-access-token
  const sellAccessToken = process.env.sellAccessToken;
  const sellDomain = 'api.getbase.com'
  const apiPath = '/v2/leads';
  const method = 'GET';

  const req = {
    hostname: sellDomain,
    path: apiPath,
    headers: {
      "Accept": "application/json",
      "Authorization": 'Bearer ' + sellAccessToken,
      "User-Agent": "none"
    },
    body: ''
  }

  //console.log(`getSellLeads.req: ${JSON.stringify(req, null, 2)}`);

  // API call - https://developers.getbase.com/docs/rest/reference/leads
  const res = await httpsRequest(method, req);  
  const sellLeadData = JSON.parse(res.toString());
  //console.log(`getSellLeads() - Sell Lead Data: ${JSON.stringify(sellLeadData, null, 2)}`);  
  // sellLeadData contains a items array with a data element, the contact data is under items[x].data
  // Interesting elements include id, first_name, last_name, organization_name, title
  // !!!TODO max results is 25 handle pagenated requests
  
  return sellLeadData;
}

function emailIsValid (email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function getSunshinePeopleIDFromEmail(emailAddress) {  
  if (!emailAddress || !emailIsValid(emailAddress)) {
    console.log(`getSunshinePeopleIDFromEmail: invalid email - ${emailAddress}`);
    return 0;
  }

  // Get PErson and Identifier syntax - https://developer.zendesk.com/rest_api/docs/sunshine/profiles#identifier-query-syntax
  const apiPath = '/api/sunshine/people';
  const identifierQuery = `?identifier=support:email:${emailAddress}`;
  const method = 'GET';
  const req = {
    hostname: zendeskHost,
    path: apiPath + identifierQuery,
    headers: {
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: ''
  };

  //console.log(`getSunshinePeopleIDFromEmail(): request - ${JSON.stringify(req, null, 2)}`);
  const res = await httpsRequest(method, req);
  //console.log("getSunshinePeopleIDFromEmail(): response - " + JSON.stringify(res, null, 2));  
  if (res.id && res.id === 1019) {
    return 0;
  } else {
    return res.data.id;
  }
}

async function getSupportUserIDFromEmail(emailAddress) {  
  if (!emailAddress || !emailIsValid(emailAddress)) {
    console.log(`getSupportUserIDFromEmail: invalid email - ${emailAddress}`);
    return 0;
  }

  // Get Support User info from Support Search - https://developer.zendesk.com/rest_api/docs/support/search
  const apiPath = '/api/v2/search.json';
  const queryString = `?query=type:user%20"${emailAddress}"`;
  //const queryString = `?query=type:user%20"a@b.com"`;
  const method = 'GET';
  const req = {
    hostname: zendeskHost,
    path: apiPath + queryString,
    headers: {
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: ''
  };

  //console.log(`getSupportUserIDFromEmail(): request - ${JSON.stringify(req, null, 2)}`);
  const res = await httpsRequest(method, req);
  //console.log("getSupportUserIDFromEmail(): response - " + res.toString()); 
  const response = JSON.parse(res.toString());  
  if (!response.results || !response.results[0].id) {
    // not found return 0
    console.log(`getSupportUserIDFromEmail() - SupportUser with email address of ${emailAddress} not found`);
    return 0;
  } else {
    // otherwise return the ID
    return response.results[0].id;
  }  
}

async function createSunshineProfile(source, profile) {  
  if (!source) {
    console.log(`createSunshineProfile(): invalid source ${source}`);
    return 0;
  }
  if (!profile) {
    console.log(`createSunshineProfile(): invalid profile - ${JSON.stringify(profile, null, 2)}`);
    return 0;
  }
  if (!profile.email || !emailIsValid(profile.email)) {
    console.log(`createSunshineProfile(): invalid profile.email ${profile.email}`);
    return 0;
  }

  //console.log(`createSunshineProfile() - profile: ${source} - ${JSON.stringify(profile, null, 2)}`);  

  // Create new Profile - https://developer.zendesk.com/rest_api/docs/sunshine/profiles#create-or-update-profile
  const apiPath = '/api/sunshine/profile';  
  const method = 'POST';
  const body = {
    profile: {
      source: source,
      type: "default",
      identifiers: {
        "email": profile.email
      },
      attributes: profile
    }
  };
  const req = {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: JSON.stringify(body)
  };

  //console.log(`createSunshineProfile(): request - ${JSON.stringify(req, null, 2)}`);
  const res = await httpsRequest(method, req);
  //console.log("createSunshineProfile(): response - " + JSON.stringify(res.toString(), null, 2));   
  if (res.id) {  
    console.log(`createSunshineProfile(): error - ${res.id}: ${res.reason}`);
    return 0;
  } else {
    return profile.email; // This is the key
  }
}

async function attachProfileToPerson(source, personID, profile) {  
  if (!source) {
    console.log(`attachProfileToPerson(): invalid source ${source}`);
    return 0;
  }
  if (!personID || personID <= 0) {
    console.log(`attachProfileToPerson(): invalid personID - ${personID}`);
    return 0;
  }
  if (!profile) {
    console.log(`attachProfileToPerson(): invalid profile - ${JSON.stringify(profile, null, 2)}`);
    return 0;
  }
  if (!profile.email || !emailIsValid(profile.email)) {
    console.log(`attachProfileToPerson(): invalid profile.email ${profile.email}`);
    return 0;
  }

  //console.log(`attachProfileToPerson() - personID: ${personID} for ${source} with profile ${JSON.stringify(profile, null, 2)}`);

  // Attach new Profile to existing person - https://developer.zendesk.com/rest_api/docs/sunshine/profiles#attach-new-profile-to-existing-person
  const apiPath = '/api/sunshine/profiles/attach';  
  const method = 'POST';
  const body = {
    profiles: [
        {
            source: source,
            identifiers: {
                email: profile.email
            }
        }
    ],
    target_person: {
        identifier: "support:user_id:" + personID // Support User ID 
    }
  };
 
  const req = {
    hostname: zendeskHost,
    path: apiPath,
    headers: {
      "Authorization": 'Basic ' + encodedUserToken
    },
    body: JSON.stringify(body)
  };

  //console.log(`attachProfileToPerson(): request - ${JSON.stringify(req, null, 2)}`);
  const res = await httpsRequest(method, req);
  //console.log("attachProfileToPerson(): response - " + res.toString());    
  if (res.id) {  // sometimes the response is {"invalid_profile_indexes":[0]}", but doesn't seem to cause issues
    console.log(`attachProfileToPerson(): error - ${res.id}: ${res.reason}`);
    return 0;
  } else {  // returns blank for success
    return profile.email;
  }
}

module.exports.putSellUsersToSunshineProfile = async (event) => {
  //console.log(`putSellUsersToSunshineProfile() - called`);
  //console.log(JSON.stringify(event, null, 2));  

  // Get list of Sell Users
  const sellUsers = await this.getSellUsers(event);
  // Use this temporarily
  //const sellUsers = event; // Has a user that doesn't exist
  console.log(`putSellUsersToSunshineProfile(): sellUsers - ${JSON.stringify(sellUsers, null, 2)}`);
  var users = [];
  users = sellUsers.items;

  const putSellUser = users.map(async function (user) {
    // Get support User ID from the sell email
    var supportUserID = await getSupportUserIDFromEmail(user.data.email);
    console.log(`\nputSellUsersToSunshineProfile(): Processing User: ${user.data.name} ${user.data.email}`);
    //console.log(JSON.stringify(user.data, null, 2));
    console.log(`putSellUsersToSunshineProfile(): SupportUserID for ${user.data.email} - ${supportUserID}`);    
    if (supportUserID === 0) // User Not found must create person
    { // For now need to figure out how to create a Person, so just skip
      //console.log(`TODO putSellUsersToSunshineProfile(): Creating Person - ${user.data.name}:${user.data.email}`);
      console.log(`putSellUsersToSunshineProfile(): Skipping Person - ${user.data.name}:${user.data.email} since doesn't exist in Support`);
      //supportUserID = -1;
      return user;
    }

    // Create Profile
    // https://developer.zendesk.com/rest_api/docs/sunshine/profiles#create-or-update-profile
    const source = "Sell";
    const profileID = await createSunshineProfile("Sell", user.data);
    if (profileID)
      console.log(`putSellUsersToSunshineProfile(): ${source} ProfileID ${profileID} created`);
    else
      console.log(`putSellUsersToSunshineProfile(): error creating profile`);
    
    // Now attach profile
    console.log(`putSellUsersToSunshineProfile(): Attaching Profile to Person ${user.data.email} with SupportUserID of ${supportUserID}`);
    const attachedID = await attachProfileToPerson(source, supportUserID, user.data);  
    if (attachedID)
      console.log(`putSellUsersToSunshineProfile(): ${source} ProfileID ${profileID} now belongs to SupportUserID of ${supportUserID}`);
    else 
      console.log(`putSellUsersToSunshineProfile(): error attaching ProfileID ${profileID} to SupportUserID of ${supportUserID}`);

    return user;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ok'  
    }, null, 2),
  };  
}

