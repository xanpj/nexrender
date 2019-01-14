//const request = require('request');
/*
const project = '408968891068'
const zone = 'us-east1-b'
const resourceId = 'instance-1'
*/
/*
const startInstance = `https://www.googleapis.com/compute/v1/projects/${project}/zones/${zone}/instances/${resourceId}/start`
const stopInstance = `https://www.googleapis.com/compute/v1/projects/${project}/zones/${zone}/instances/${resourceId}/stop`

console.log(stopInstance)
request.post(stopInstance, function (error, response, body) {
  console.log(error)
  console.log(response)
  console.log(body)
        if (!error && response.statusCode == 200) {
            console.log(body)
            console.log(response)
        } else {
          console.log("Error"+error)
        }
    });
*/

/*
const {google} = require('googleapis');
var compute = google.compute('v1');

authorize(function(authClient) {
  var request = {
    // Project ID for this request.
    project: project,  // TODO: Update placeholder value.

    // The name of the zone for this request.
    zone: zone,  // TODO: Update placeholder value.

    // Name of the instance resource to start.
    instance: resourceId,  // TODO: Update placeholder value.

    auth: authClient,
  };

  compute.instances.stop(request, function(err, response) {
    if (err) {
      console.error(err);
      return;
    }

    console.log(response)
    // TODO: Change code below to process the `response` object:
    //console.log(JSON.stringify(response, null, 2));
  });
});

function authorize(callback) {
  google.auth.getApplicationDefault(function(err, authClient) {
    if (err) {
      console.error('authentication failed: ', err);
      return;
    }
    if (authClient.createScopedRequired && authClient.createScopedRequired()) {
      var scopes = ['https://www.googleapis.com/auth/cloud-platform'];
      authClient = authClient.createScoped(scopes);
    }
    callback(authClient);
  });
}
*/

// Imports the Google Cloud client library
const Compute = require('@google-cloud/compute');

const compute = new Compute();
const zone = compute.zone('us-east1-b');
const vm = zone.vm('instance-1');

/*
vm.start(function(err, operation, apiResponse) {
  // `operation` is an Operation object that can be used to check the status
  // of the request.
});*/

//-
// If the callback is omitted, we'll return a Promise.
//-
vm.stop().then(function(data) {
  console.log(data)
  const operation = data[0];
  const apiResponse = data[1];
}).catch(function(err) {
  console.log("Error" + err)
});
