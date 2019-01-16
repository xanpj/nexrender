'use strict';
const config = require('../../CONFIG.js');

module.exports = function(project) {
    return new Promise((resolve, reject) => {
    try {
      'use strict';
const config = require('./CONFIG.js');
const keyframeGen = require('./lib/keyframeGen.js')
const spawn = require('child_process').spawn;

const params = {
    songFilePath: config.assetsPath+config.mixfile,
    keyframesFilePath: config.assetsPath+config.datascript,
    fps: config.FPS
}

//Creating keyframes from audio, and receiving the audio length in seconds
keyframeGen.createKeyframes(params).then((audioLengthInSeconds) => {

    //project duration in frames (equal to song length or custom)
    let duration = (config.duration == 0) ? Math.round(audioLengthInSeconds * config.FPS) : config.duration;

    /**
     * Dependencies
     */
    const http      = require('http');
    const url       = require('url');
    const path      = require('path');
    const fs        = require('fs');

    const Project   = require('nexrender').Project;
    const renderer  = require('nexrender').renderer;

    /**
     * HTTP server
     */
    let server = http.createServer((req, res) => {

        let uri         = url.parse(req.url).pathname;
        let filename    = path.join(process.cwd(), uri);

        fs.exists(filename, (exists) => {
            if(!exists) {
                res.writeHead(404, {"Content-Type": "text/plain"});
                res.write("404 Not Found\n");

                return res.end();
            }

            fs.readFile(filename, "binary", function(err, file) {
                if(err) {
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.write(err + "\n");
                    return res.end();
                }

                // send 200
                res.writeHead(200);
                res.write(file, "binary");
                return res.end();
            });
        });
    });

    /**
     * Renderer
     */
    server.listen(config.port, () => {

        console.log('Started local static server at port:', config.port);

        // addtional info about configuring project can be found at:
        // https://github.com/Inlife/nexrender/wiki/Project-model
        let project = new Project({
            "template": "project.aepx",
            "composition": "Main",
            "type": "default",
            "settings": {
                "outputModule": config.outputModule,
                "startFrame": 0, //TODO hack
                "endFrame": duration,
                "outputExt": config.outputExt
            },
            "assets": [
                { "type": "project", "name": "project.aepx",    "src": `http://localhost:${config.port}/assets/${config.aepxfile}`},
                { "type": "image",   "name": "background.jpg",  "src": `http://localhost:${config.port}/assets/${config.background}` },
                { "type": "image",   "name": "cover.jpg",       "src": `http://localhost:${config.port}/assets/${config.cover}` },
                { "type": "audio",   "name": `song.${config.audioExt}`,  "src": `http://localhost:${config.port}/assets/${config.mixfile}` },
                { "type": "script",  "name": "keyframes.txt",   "src": `http://localhost:${config.port}/assets/${config.datascript}` }
            ]
        });

        console.log(project);

        // start rendering
        renderer.render(config.aebinary, project).then(() => {
            // success
            server.close();
            console.log('Rendering finished!');
            console.log('Conversion to MP4 format started...');

            //Converting resulting video to youtube ready format (H.264 / AAC audio)
            //See https://gist.github.com/mikoim/27e4e0dc64e384adbcb91ff10a2d3678
            var cmd = './ffmpeg';
            var resultFilePath = "results/"+project.uid+"_result." + config.outputExt
            var resultFilePathNew = "results/"+project.uid+"_result" + ".mp4"
            var args = [
                '-i', resultFilePath,
                '-c:v','libx264',
                '-preset','slow',
                '-profile:v','high',
                '-crf','18',
                '-coder','1',
                '-pix_fmt','yuv420p',
                '-movflags','+faststart',
                '-g','30',
                '-bf','2',
                '-c:a','aac',
                '-b:a','384k',
                '-profile:a','aac_low',
                resultFilePathNew
            ];

            var proc = spawn(cmd, args);

            proc.stdout.on('data', function(data) {
                console.log(data);
            });

            proc.stderr.on('data', function(data) {
                //console.log(data)
                //throw new Error("Video conversion failed. Pre-converted video in results folder ");
            });

            proc.on('close', function() {
                console.log('Conversion to MP4 format finished!');
                console.log('---------------------------------');
                console.log('Finished!');
            });

        }).catch((err) => {
            // error
            console.error(err);
            server.close();
        });

    });
}).catch(err => console.log(err))
    } catch(err){
      reject(err);
    }
  });
}
