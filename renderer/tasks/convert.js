'use strict';
const config = require('../../CONFIG.js');
const spawn = require('child_process').spawn;

const MULTICORE = true
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

            var resultFilePath = "results/"+project.uid+"_result." + "jpg"//config.outputExt
            var resultFilePathNew = "results/"+project.uid+"_result" + ".mp4"
            if(MULTICORE) {
              resultFilePath = "\\temp\\" + "result_\%05d." + "jpg"
			  //resultFilePath = path.join( process.cwd(), project.workpath, resultFilePath )
			  resultFilePath = "C:\\Users\\apjagaciak\\Documents\\code\\trapnationrender-prod\\temp\\sXH4_qbv4"+resultFilePath

            }
            var audioFile = project.workpath+"\\"+project.assets.find(x => x.type == "audio").name //TODO
            var args = [
                '-r', '30',
                '-i', resultFilePath,
                '-i', audioFile,
                '-crf','1',
                '-pix_fmt','yuv420p',
                '-c:a','aac',
                '-b:a','384k',
                '-r', '30',
                '-shortest','-y',
                resultFilePathNew
            ];
			console.log(args)
            var proc = spawn(cmd, args);

            proc.stdout.on('data', function(data) {
                //console.log(data);
            });

            proc.stderr.on('data', function(data) {
                console.log(data)
                //throw new Error("Video conversion failed. Pre-converted video in results folder ");
            });

            proc.on('close', function(err) {
				if(err) console.log(err)
                console.log('Conversion to MP4 format finished!');
            });
            resolve(project)
    } catch(err){
      reject(err);
    }
  });
}
