const https = require('https');

const AWS = require('aws-sdk');
const translate = new AWS.Translate();
const comprehend = new AWS.Comprehend();
const sns = new AWS.SNS(); 

exports.handler = (event, context, callback) => {
    var ticket = event; // This will hold all the ticket parameters the trigger in Zendesk passes us

    // only fire for ticket created
    if (ticket.detail.ticket_event.type !== 'Comment Created' ) {
        //console.log("not a comment exiting");
        return true;
    }

    // only fire for public
    if (ticket.detail.ticket_event.comment.is_public !== true ) {
        //console.log("not a public comment exiting");
        return true;
    }
    
    // Log our ticket object to the console.  In lambda functions any console output is written to Cloudwatch log group and stream for this function.
    // https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions-logs.html    
    console.log("Ticket: " + JSON.stringify(ticket, null, 2));

    // Force Priority since it doesn't exist - Events Connector doesn't pass this yet
    ticket.Priority = 'Urgent';

    // This block of code just runs at the end to send status codes and error messages
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Amazon Translate - runs first
    // https://docs.aws.amazon.com/translate/latest/dg/API_TranslateText.html
    var params = {
        SourceLanguageCode: 'auto', /* required */
        TargetLanguageCode: 'en', /* required -- Hint change this if you want a different language then english */      
        Text: ticket.detail.ticket_event.comment.body, /* required */
    };
    translate.translateText(params, function(err, data) {
        if (err) console.log("Error Translating: " + err, err.stack); // an error occurred
        else    { // successful response
            console.log(`Translation = ${JSON.stringify(data, null, 2)}`);;
            ticket.EnglishDescription = data.TranslatedText;
            ticket.sourceLanguage = data.SourceLanguageCode;

            // SNS - runs after translate
            if (ticket.Priority == "Urgent") {
                console.log('Sending SMS');
                var snsParams = {
                    Message: ("New Urgent Ticket! ID = " + ticket.detail.ticket_event.ticket.id + "; Description: " + ticket.EnglishDescription),
                    PhoneNumber: process.env.PHONENUMBER
                };
                console.log("SNS Params: " + JSON.stringify(snsParams, null, 2));
                sns.publish(snsParams, function(err, data) {
                    if (err) console.log('SNS error', err, err.stack);
                    else console.log("SNS message sent");
                });
            }

            // Now use Comprehend to run sentiment analysis on the converted text
            const params = {
                Text: ticket.EnglishDescription
            };

            var sentiment_score = '';
            var sentiment_tag = '';
            // Detecting the dominant language of the text
            // https://docs.aws.amazon.com/comprehend/latest/dg/get-started-api-dominant-language.html
            comprehend.detectDominantLanguage(params, function (err, result) {
                if (!err) { // Success
                    const language = result.Languages[0].LanguageCode;
                    const sentimentParams = {
                        Text: ticket.EnglishDescription,
                        LanguageCode: language
                    };
                    console.log(`Sentiment Params: ${JSON.stringify(sentimentParams, null, 2)}`);

                    // Analyze the sentiment
                    // https://docs.aws.amazon.com/comprehend/latest/dg/get-started-api-sentiment.html
                    comprehend.detectSentiment(sentimentParams, function (err, data) {
                        if (err) console.log("Error in detectSentiment" + err, err.stack); // an error occurred
                        else {
                            console.log(`Sentiment: ${JSON.stringify(data, null, 2)}`);
                            const sentiment = data.Sentiment;
                            sentiment_tag = `Sentiment_${sentiment}`;
                            sentiment_score = `\n\n---Sentiment score---\n${JSON.stringify(data.SentimentScore)}`;

                            // ZENDESK: Send translation back to Zendesk ticket as a comment when source language isn't English
                            if(data.SourceLanguageCode != 'en') { // only put translation back if its not already in english
                                var postData = JSON.stringify({
                                    'ticket': {
                                        'tags': [sentiment_tag],
                                        'comment': {
                                            "body": ('---English Translation of Body---\n' +  ticket.EnglishDescription) + sentiment_score,
                                            "public": false // Put as an internal comment
                                        }
                                    }
                                });

                                // Log the post data
                                console.log(`Zendesk Support API Update Ticket postData: ${postData}`);
                                
                                // Create authorization string in base64
                                // https://developer.zendesk.com/rest_api/docs/support/introduction#api-token
                                let authString = (process.env.ZENDESK_USEREMAIL + '/token:' + process.env.ZENDESK_APIKEY);
                                let buff = new Buffer(authString);
                                let base64Auth = buff.toString('base64');

                                var headers = {
                                    'Content-Type': 'application/json',
                                    'Content-Length': Buffer.byteLength(postData),
                                    'Authorization' : ('Basic ' + base64Auth),
                                };
                                
                                var options = {
                                    method: 'PUT',
                                    headers: headers,
                                    host: process.env.ZENDESK_DOMAIN,
                                    path: ('/api/v2/tickets/' + ticket.detail.ticket_event.ticket.id + '.json'),
                                    body: postData
                                };

                                // Call the zendesk support API To update the ticket
                                // https://developer.zendesk.com/rest_api/docs/support/tickets#update-ticket
                                const req = https.request(options, (res) => {
                                    console.log('Zendesk API response status: ', res.statusCode, res.statusMessage);
                                    res.on('data', (d) => {
                                        process.stdout.write(d);
                                    });
                                });

                                // If there is an error write log that
                                req.on('error', (e) => {
                                    console.error("Error calling Zendesk API: " + e);
                                });

                                // Write data to request body
                                req.write(postData);
                                req.end();
                            }
                        }
                    });
                }
            });
        }
    });
};