# Workflow management tool

Asana Card:
[Asana Card](https://app.asana.com/0/1121246347800639/1121246418123671)

## Features
Workflow management MVP - currently:

* Copies all the given instance's Sunshine Profiles into the same account's Connect.users.

## Using the workflow tool

### Prerequisites

* You must be on Zendesk Enterprise plan to have access to Custom Objects.
* You must be technically able to make API calls to create the order and SKUs objects records, and the relationship records to tie them together with the user. See [Custom Objects Documentation](https://developer.zendesk.com/rest_api/docs/custom-objects-api/introduction) for more detail. 
* The User Events API is currently in Early Access. You must sign up to the [User Events API early access program](https://develop.zendesk.com/hc/en-us/articles/360001844267-Using-the-User-Events-API-early-access-) to be able use the API and create Custom User Events.
* Have your own AWS account and have a user that has admin'ish privledges
* Have Node 10x or higher
* Have AWS Cli Installed
* Have Serverless framework installed
* Have appropiate secrets setup in AWS System Manager Parameter Store
* Have Git installed

### Getting started
Please have your own Zendesk instance setup with Custom Objects, Profiles and Events.  We will start from this point.

1.  Download / Install Node 10.x or greater 
    1. [Download the Latest LTS version for your OS](https://nodejs.org/en/download/)
    2. Install Node 10.x 
        1. [MAC](https://nodesource.com/blog/installing-nodejs-tutorial-mac-os-x/) 
        2. [WIN](https://www.wikihow.com/Install-Node.Js-on-Windows) 
        3. [LINUX](https://nodejs.org/en/download/package-manager/)
2. [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
    1. [MAC](https://docs.aws.amazon.com/cli/latest/userguide/install-macos.html) 
    2. [WIN](https://docs.aws.amazon.com/cli/latest/userguide/install-windows.html) 
    3. [LINUX](https://docs.aws.amazon.com/cli/latest/userguide/install-linux.html)
    4. [Configure AWS ClI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) - 
        1. You will need a AWS Access Key and Secret Access Key [AWS Docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html) - save the keys as you will not be shown the secret key again
        2. Run ```aws configure``` - you will need your access keys, make sure to set the default region to 'us-west-2'
3. [Install Serverless Framework](https://serverless.com/framework/docs/getting-started/)
    1. Install ```npm install -g serverless```
    2. Update from previous version ```npm update -g serverless```
3. Mac - open terminal, Windows Commandline
4. Setup Secrets in AWS System Manager Parameter Store
    1. Zendesk Subdomain
        1. Note your Zendesk's subdomain        
        2. Type the following command ```aws ssm put-parameter --name "/Workflow/dev/subdomain" --value "[YOUR SUBDOMAIN]" --type String```
        3. Make sure to replace [YOUR SUBDOMAIN] with your subdomain; ex if your subdomain is apple ```aws ssm put-parameter --name "/Workflow/dev/subdomain" --value "apple" --type String```
        4. If it succeeeds it should return { "Version": 1}, if you get an error [check the command syntax](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-cli.html)
    2. Zendesk user
        1. Note your Zendesk user (should have admin rights)
        2. Type the following command ```aws ssm put-parameter --name "/Workflow/dev/user" --value "[YOUR EMAIL]" --type String ```
        3. Make sure to replace [YOUR EMAIL] with your email address of your admin; ex if your email is test@example.com ```aws ssm put-parameter --name "/Workflow/dev/subdomain" --value "test@example.com" --type String```
        4. If it succeeeds it should return { "Version": 1}, if you get an error [check the command syntax](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-cli.html)
    3. Create a token for access to your Zendesk Instance
        1. Go to your domain's Setup/Channels/API page https://YourDomain.zendesk.com/agent/admin/api/settings - Replace YourDomain!
        2. Make sure token access is enabled, if not enable it ![Alt text](/screenshots/token_access.jpg?raw=true "Turn on Token Access")
        3. Create a Token, make sure to copy it for later, as once you close out it will not be shown again
        4. Type the following command ```aws ssm put-parameter --name "/Workflow/dev/apiToken" --value "[YOUR TOKEN]" --type String```
        5. Make sure to replace [YOUR TOKEN] with the token you generated in #2 above; ex if your token is 12345 ```aws ssm put-parameter --name "/Workflow/dev/apiToken" --value "12345" --type String```
        6. If it succeeeds it should return { "Version": 1}, if you get an error [check the command syntax](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-cli.html)
    4. Get your Connect Private Key
        1. To get your Connect Private Key go to https://YourDomain.zendesk.com/connect/dashboard/dashboard/settings/environments - Replace YourDomain with your actual domain
        2. On this page retreive the Production or Development private key
        3. Type the following command ```aws ssm put-parameter --name "/Workflow/dev/connectPrivateKey" --value "YOUR PRIVATE KEY" --type String```
        4. Make sure to replace [YOUR PRIVATE KEY] with your actual private key; ex if your private key is abcde ```aws ssm put-parameter --name "/Workflow/dev/connectPrivateKey" --value "abcde" --type String```
    5. Verify Parameters were saved
        1. Using the command line ```aws ssm describe-parameters --filters "Key=Name,Value=/Workflow/dev/"```
        2. Using the [AWS Console](https://us-west-2.console.aws.amazon.com/systems-manager/parameters?region=us-west-2) 
        3. If you are having problems seeing the Parameters double check that the aws ssm put-parameter calls were done and did not have errors
5. [Install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
6. Create a [Github account](https://github.com/join)
7. Have your github account [sponsored](https://zendeskit.zendesk.com/hc/en-us/articles/360006728793)

#### 1. Clone Repo
1. Clone the [PA_apps](https://github.com/zendesk/pa_apps) repo
    1. [Instructions](https://help.github.com/en/articles/cloning-a-repository) - how to Clone a github repo
    2. Find a location on your local machine then open (on MAC) terminal and type the following command ```git clone https://github.com/zendesk/pa_apps.git```
    3. 
n object type is a blueprint for creating object records of the same type. You can create the types via API or through the Zendesk UI (Admin > Manage > Custom Objects). You can specify any number of properties for your object. All properties have to be of type **string**, and make sure to **use the same key as defined below**:

1. Create object type with key = **order** ([example](https://cl.ly/1187aed75e4e))
2. Create object type with key = **sku** ([example](https://cl.ly/36c3923e2d4f))

#### 2. Build and Deploy Workflow tool
A relationship type defines a relationship between object records (1-to-1, 1-to-many, many-to-many).

1. Create a 1-to-many relationship type with key = **ordered** / source = zen:user / type = 1:many / target = order ([example](https://cl.ly/1ab0faba7727)).
2. Create a many-to-many relationship type by creating 2x 1-to-many relationship types:
    1. Relationship type with key = **contains** / source = order / type = 1:many / target = sku ([example](https://cl.ly/6be6d7c32ef4)).
    2. Relationship type key = **used_in** / source = sku / type = 1:many / target = order ([example](https://cl.ly/51d7586081ba)).

#### 3. Verify Working


### Additional Resources
1. [Git - Getting Started](https://git-scm.com/book/en/v1/Getting-Started)
2. [Serverless 101](https://www.youtube.com/playlist?list=PLGyRwGktEFqedFrqKLIzmUXlsiQ4tbdyo)
3. [Node.js Getting Started](https://nodejs.org/en/docs/guides/getting-started-guide/)

