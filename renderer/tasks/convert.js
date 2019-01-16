'use strict';
const config = require('../../CONFIG.js');
const spawn = require('child_process').spawn;

module.exports = function(project) {
    return new Promise((resolve, reject) => {
    try {
            console.log('Rendering finished!');
            console.log('Conversion to MP4 format started...');

            //Converting resulting video to youtube ready format (H.264 / AAC audio)
            //See https://gist.github.com/mikoim/27e4e0dc64e384adbcb91ff10a2d3678
            var isWin = process.platform === "win32";
            var cmd = './ffmpeg';
            if(isWin) {
              cmd = 'ffmpeg.exe';
            }
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
                //console.log(data);
            });

            proc.stderr.on('data', function(data) {
                //console.log(data)
                //throw new Error("Video conversion failed. Pre-converted video in results folder ");
            });

            proc.on('close', function() {
                console.log('Conversion to MP4 format finished!');
            });
            resolve(project)
    } catch(err){
      reject(err);
    }
  });
}
