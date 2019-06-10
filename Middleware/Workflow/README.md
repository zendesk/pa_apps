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
Clone the [PA_apps](https://github.com/zendesk/pa_apps) repo
    1. [Instructions](https://help.github.com/en/articles/cloning-a-repository) - how to Clone a github repo
    2. Find a location on your local machine then open (on MAC) terminal and type the following command ```git clone https://github.com/zendesk/pa_apps.git```
    3. Change to the Middleware/Workflow directory which is where the Workflow MVP lives

#### 2. Build and Deploy Workflow tool
1. Initialize - Within the PA_apps/Middleware/Workflow directory type the following command ```npm install``` this will initialize the folder and download any required dependancies
2. Deploy - now type ```serverless deploy -r us-west-2 -v --aws-s3-accelerate``` this will deploy the Serverless applicatoin using cloudformation, if everything is installed correctly this should succeed without errors.
    1. If there are errors go to your AWS console and then to cloudformation, find the Workflow-dev stack, and then click on the events tab, find the earilest error, this should indicate what the problem is, I suggest googling this error as a start, most likely there will be a post on a blog with more info on how to troubleshoot it.

#### 3. Verify Working / Testing / Changes
1. To test changes type ```serverless invoke local -f callIntegration``` this will invoke the lambda function locally.
2. During testing I suggest opening a new terminal and tailing the logs - ```serverless logs -f callIntegration -t"```
3. Another option is to go into CloudWatch and view the logs, there are two ways to do this:
    1. Go into Cloudwatch, then logs tab, find theaws/lambda/Workflow-dev-callIntegratiion log group, then the most recent log stream
    2. Go into Lambda find the Workflow-dev-callIntegration - function, then click the monitoring tab, (shows some nice graphs) then click View logs in Cloudwatch.
    3. Both get you to the same place, just two different ways of going the same thing.

#### 4. Commit changes to github
1. Type git status - to get the status of your changes
2. Type git add . - add all the changed files
4. Type git commit -m "Your comment" - commit changes with comment
5. Type git push origin master - push changes to remote github repo


### Additional Resources
1. [Git - Getting Started](https://git-scm.com/book/en/v1/Getting-Started)
2. [Serverless 101](https://www.youtube.com/playlist?list=PLGyRwGktEFqedFrqKLIzmUXlsiQ4tbdyo)
3. [Node.js Getting Started](https://nodejs.org/en/docs/guides/getting-started-guide/)

