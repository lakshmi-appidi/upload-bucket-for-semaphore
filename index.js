var AWS = require('aws-sdk');
var twilio = require('twilio');

exports.handler = function(event, context) {
  console.log("JSON API from Semaphore: %j", event);

  AWS.config.apiVersions = {
    s3: '2006-03-01'
  }

  // My bucket with numbers.json is located in the 'us-west-2' region
  var s3 = new AWS.S3({region: 'us-west-2'});
  // This is where you define the location of the bucket and the file S3 needs to retrieve
  var params = {Bucket: 'upload-bucket-for-semaphore', Key: 'numbers.json'};

  s3.getObject(params, function(err, data) {
    if(err) console.log(err, err.stack); // an error has happened on AWS

    // Parse JSON file and put it in numbers variable
    var numbers = JSON.parse(data.Body);

    manipulateNumbers(numbers);
  });

  function manipulateNumbers(numbers) {
   // If someone breaks the master build on Semaphore, enter the if statement
   if(event.branch_name == "master" && event.result == "failed") {
      // We get the name of the user who broke a build
      var blame = event.commit.author_name;

      // The message that is sent to the developer who broke the master branch
      var message = "Congrats " + blame + ", you managed to brake master branch on SemaphoreCI!."

      twilioHandler(numbers, message);
    };
  };

  function twilioHandler(numbers, message) {
    var blame_mail = event.commit.author_email;
    // twilio credentials
    var twilio_account_sid = numbers.twilio.twilio_account_sid;
    var twilio_auth_token = numbers.twilio.twilio_auth_token;
    var twilio_number = numbers.twilio.twilio_number;

    var client = twilio(twilio_account_sid, twilio_auth_token);

    // Send SMS
    client.sendSms({
      to: numbers[blame_mail],
      from: twilio_number,
      body: message
    }, function(err, responseData) { // this function is executed when a response is received from Twilio
      if (!err) {
        console.log(responseData);
        context.done(null, "Message sent to " + numbers[blame_mail] + "!");
      } else {
        console.log(err);
        context.done(null, "There was an error, message not sent!");
      }
    });
  };
}