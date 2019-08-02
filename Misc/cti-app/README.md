<img src="./assets/logo.png" align="left" title="CTI app logo" alt="App Logo" width="80px" height="80px">

# CTI app

The CTI app simulates an integration between Zendesk Support and a CTI partner through Talk Partner Edition APIs. The app let's the user demo a call coming in, the dynamic creation of a call ticket, and dynamic update of the ticket with the call information & recording.

<p align="center">
    <img src="https://cl.ly/44295a3b4426/Screen%252520Recording%2525202019-06-24%252520at%25252012.37%252520pm.gif" width="600px">
    <img src="https://cl.ly/c12819af79d6/Screen%252520Recording%2525202019-06-24%252520at%25252012.35%252520pm.gif" width="200px">
</p>

### App location:
* Top bar

### Features:
* Display custom partner logo in the header of the app
* Display custom caller information
* Create and pop open a call ticket on the current user's screen
* Update call ticket with custom call information & call recording
* Update ticket field with call reason (optional)

## Using the app

### Prerequisites

* You must be on Zendesk Support Professional plan or above to be able to install private apps 
* You must have Talk Partner Edition or any paid Talk plan to be able to use the TPE APIs

### Getting started

1. Download this project as a ZIP file
2. Open the ZIP file, and change the customer-profile.jpg and logo-integration.jpg and re-zip (optional)
3. Create a custom ticket field for call reason and copy field ID (optional)
4. Upload the ZIP file as a private app

### Settings
You can update the settings below to customise the information displayed in the app and added to the ticket:

* Caller name: Name of the caller
* Caller phone number: Phone number of the caller
* Caller info: Additional info displayed next to the caller profile
* Caller ID: Zendesk User ID of the caller. Will be set as requester on the ticket
* About: Reason for the call. Will be visible on the internal notes in the ticket
* Custom field ID: ID of the custom ticket dropdown field to update with call reason
* Custom field value: Value of the custom field to update (use option tag for dropdown field)

## Known Issues & Limitations

* Times in the initial internal note and the recording update are showing in different timezones
