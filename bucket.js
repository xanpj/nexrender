//const request = require('request');
const projectId = '408968891068'

// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');

// Creates a client
const storage = new Storage({
  projectId: projectId,
});

async function makePublic(bucketName, filename) {
  // Makes the file public
  await storage
    .bucket(bucketName)
    .file(filename)
    .makePublic();

  console.log(`gs://${bucketName}/${filename} is now public.`);
  // [END storage_make_public]
}

async function uploadFile(bucketName, filename) {

    // Uploads a local file to the bucket
    await storage.bucket(bucketName).upload(filename, {
      // Support for HTTP requests made with `Accept-Encoding: gzip`
      gzip: true,
      metadata: {
        // Enable long-lived HTTP caching headers
        // Use only if the contents of the file will never change
        // (If the contents will change, use cacheControl: 'no-cache')
        cacheControl: 'public, max-age=31536000',
      },
    });

    console.log(`${filename} uploaded to ${bucketName}.`);
    // [END storage_upload_file]
  }

const bucketName = 'trapnationrender-bucket';
const file = '/Users/alex/Desktop/screen001.png';
//uploadFile(bucketName, file)
const filename = 'uploads/screen001.png'
makePublic(bucketName, filename)
