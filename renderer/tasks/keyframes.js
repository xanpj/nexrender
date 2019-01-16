'use strict';
const config = require('../../CONFIG.js');

module.exports = function(project) {
    return new Promise((resolve, reject) => {
    try {
      var fs = require('fs')
        , AudioContext = require('web-audio-api').AudioContext
        , audioCtx = new AudioContext
        , DSP = require('../../lib/dsp.js')

      console.log(project)
      console.log('Encoding audio : '
        + audioCtx.format.numberOfChannels + ' channels ; '
        + audioCtx.format.bitDepth + ' bits ; '
        + audioCtx.sampleRate + ' Hz'
      )

      const params = {
          songFilePath:  project.workpath+"/"+project.assets.find(x => x.type == "audio").name,
          keyframesFilePath: project.workpath+"/"+project.assets.find(x => x.type == "datascript").name,
          fps: config.FPS
      }
      //__dirname +
      console.log(params.songFilePath)
      fs.readFile(params.songFilePath, function(err, buffer) {
        if (err) throw err
        audioCtx.decodeAudioData(buffer, function(audioBuffer) {
          var gain = audioCtx.createGain();

          var inputL = audioBuffer.getChannelData(0)
          var inputR = audioBuffer.getChannelData(1)
          const inputSamplesLength = inputL.length
          const audioLengthInSeconds = (inputSamplesLength / audioCtx.sampleRate)
          const steps = audioCtx.sampleRate / params.fps
          const keyframesLength = Math.floor(inputL.length / (audioCtx.sampleRate / params.fps))
          var output = new Float32Array(keyframesLength);

          function root_mean_square(arr) {
            var sum_of_squares = arr.reduce(function(s,x) {return (s + x*x)}, 0);
            return Math.sqrt(sum_of_squares / arr.length);
          }

          //LOWPASS Filter
          var filterKickFreq = 60;
          var filterKick = new DSP.IIRFilter(DSP.LOWPASS, filterKickFreq, 1.0, audioCtx.sampleRate);
          filterKick.process(inputL);
          filterKick.process(inputR);

          console.log('Creating keyframes from audio...');
          //Stereo to Mono and RMS calculation (400 samples window)
          const window_size = 400;
          for (var i = 0; i < keyframesLength; i++) {
             // Generate and copy over PCM samples.
             var idx = Math.floor(i*steps)
             const rmsValL= root_mean_square(inputL.subarray(Math.max(idx-window_size, 0), Math.min(inputSamplesLength,idx+window_size)))
             const rmsValR= root_mean_square(inputR.subarray(Math.max(idx-window_size, 0), Math.min(inputSamplesLength,idx+window_size)))
             output[i] = 0.5 * (rmsValL + rmsValR) * 100
          }

          //console.log(output)
          console.log('Writing keyframes to file...');
          var file = fs.createWriteStream(params.keyframesFilePath);
          file.write("keyframes = ")
          file.write('[' + output.join(', ') + ']');
          file.end();

          audioCtx._kill();
          project.settings.endFrame = audioLengthInSeconds;
          resolve(project)

        }, function(err){
          console.log(err)
          reject(err);
        })
      })
    } catch(err){
      reject(err);
    }
  });
}
