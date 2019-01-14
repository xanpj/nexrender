

  const createKeyframes = (params) => {
    return new Promise((resolve, reject) => {
    try {
      var fs = require('fs')
        , AudioContext = require('web-audio-api').AudioContext //require('./build/AudioContext')
        , audioCtx = new AudioContext
        , Speaker = require('speaker')
        , DSP = require('./dsp')

      console.log('Encoding audio : ' 
        + audioCtx.format.numberOfChannels + ' channels ; '
        + audioCtx.format.bitDepth + ' bits ; '
        + audioCtx.sampleRate + ' Hz'
      )
      audioCtx.outStream = new Speaker({
        channels: audioCtx.format.numberOfChannels,
        bitDepth: audioCtx.format.bitDepth,
        sampleRate: audioCtx.sampleRate
      })

      //__dirname +
      fs.readFile(params.songFilePath, function(err, buffer) {
        if (err) throw err
        audioCtx.decodeAudioData(buffer, function(audioBuffer) {
          var gain = audioCtx.createGain();

          inputL = audioBuffer.getChannelData(0)
          inputR = audioBuffer.getChannelData(1)
          const inputSamplesLength = inputL.length
          const audioLengthInSeconds = (inputSamplesLength / audioCtx.sampleRate)
          const steps = audioCtx.sampleRate / params.fps
          const keyframesLength = Math.floor(inputL.length / (audioCtx.sampleRate / params.fps))
          output = new Float32Array(keyframesLength);

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
          //Stereo to Mono and calculation of RMS values with 400 samples window
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
          resolve(audioLengthInSeconds) 


        })
      })
    } catch(err){
      reject(err);
    }
  });
}

module.exports.createKeyframes = createKeyframes


