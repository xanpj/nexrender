'use strict';

const child_process = require('child_process');
const path          = require('path');
const fs            = require ('fs');

// add ability to override
let spawn = child_process.spawn;
let exec = child_process.exec;

let MULTICORE = true
let CORES = 64 //64 for jpeg
//MAC_CORES - 1. leave one physical core (ideally CPU0) for scheduling etc. see shift() later
let MAX_TRIES = 0
let AE_BINARY = "\"%AERENDER%\""


function deleteZeroSizeFrames(folder, callback){
  return new Promise((resolve, reject) => {
    fs.readdir(folder, function (err, files) {
      if (err) return reject(err);

      files.forEach(function (file, index) {
        // Make one pass and make the file complete
        var fromPath = path.join(folder, file);

        fs.stat(fromPath, function (err, stat) {
          if (err) {
            console.error("Error stating file.", err);
            if (err) return reject(err);
          }

          if (stat.isFile()) {
            console.log("'%s' is a file.", fromPath);
            let fileEmpty = stat.size == 0
            if(fileEmpty){
              //Potential problem if other thread is writing that file
              fs.unlink(fromPath, (err) => {
                if (err) {
                  console.error("File moving error.", err);
                  if (err) return reject(err);
                } else {
                  console.log("Deleted file '%s'.", fromPath);
                }
              });
            }
          }

        });
      });
    });
  });
}

function renderMissingFrames(project, params, core, maxrecursion){
  console.log("\nrenderMissingFrames\n")
  const RENDER_ALL_FRAMES_ON_SINGLE_CORE = true;
  return renderOnCore(project, params, core, maxrecursion-1, RENDER_ALL_FRAMES_ON_SINGLE_CORE);
}

function renderOnCore(project, params, core, maxrecursion, renderAllFrames){
  const DELAY = 2000
  setTimeout(function(){
    return new Promise((resolve, reject) => {
      let aedata = []
      // -s '+ str(math.ceil((endTime/cores)*i))  +' -e '+ str(math.floor((endTime/cores)*(i+1)))  +'
      var isWin = process.platform === "win32";
      if(!isWin){
        return reject( "OS unsupported for multicore processing" )
      }
      let coreSelector = "start \"\" /affinity";
      let frameBoundaries = "-s " + project.settings.startFrame + " -e " + project.settings.endFrame
      if(!renderAllFrames){
        let partToRender = core - 1; //because we avoid using CPU0
        frameBoundaries = "-s " + Math.ceil((project.settings.endFrame/CORES)*partToRender).toString() + " -e " + Math.floor((project.settings.endFrame/CORES)*(partToRender+1)).toString()
      }
      let commandString = coreSelector + " " + Math.pow(2, core).toString(16) + " " + AE_BINARY + " " + params.join(" ") + " " + frameBoundaries;

      console.log(commandString)
      let ae = exec(commandString);

      ae.on('error', (err) => {
          return reject(new Error('Error starting aerender process, did you set up the path correctly?'));
      });

      // on data (logs)
      ae.stdout.on('data', (data) => {
          aedata.push(data.toString());
      });

      // on error (logs)
      ae.stderr.on('data', (data) => {
        aedata.push(data.toString());
      });

      // on finish (code 0 - success, other - error)
      ae.on('close', (code) => {
        if(maxrecursion > 0){
          return renderOnCore(project, params, core, maxrecursion-1, renderAllFrames)
         } else {
          if (code !== 0) {
            return reject( aedata.join('') )
          }  else {
              let folder = project.workpath + "\\temp"
              deleteZeroSizeFrames(folder)
              .then(renderMissingFrames(project, params, core, maxrecursion))
              .then( (res) => resolve( project ))
              .catch( (err) => {
                aedata.push(err);
                reject( aedata.join('') )
              })
          }
         }
      });
    })
  }, DELAY);
}

/**
 * This task creates rendering process
 */
function render(project) {
    return new Promise((resolve, reject) => {

        console.info(`[${project.uid}] rendering project...`);

        // create container for data and parameters
        let aedata = [];
        let params = [];

        let outext = (project.settings && project.settings.outputExt) ? project.settings.outputExt : 'mp4';

        // set default project result file name
        project.resultname = 'result' + '.' + outext;

        // NOTE: for still (jpg) image sequence frame filename will be changed to result_[#####].jpg
        // NOTE: if you want to change this field, also goto actions/copy-to-results.js, and apply changes there too
        if (project.settings &&
            project.settings.outputExt &&
            ['jpeg', 'jpg', 'tiff'].indexOf(
                project.settings.outputExt.toLowerCase()
            ) !== -1
        ) {
            project.resultname = 'result_[#####]' + '.' + outext;
        }

        // setup parameters
        params.push('-comp',        project.composition);
        params.push('-project',     path.join( project.workpath, project.template ));
        params.push('-output',      path.join( project.workpath, "temp\\" + project.resultname ));

        // advanced parameters
        if (project.settings) {

            if (project.settings.outputModule) {
                params.push('-OMtemplate', project.settings.outputModule);
            }

            if (!MULTICORE && project.settings.renderSettings) {
                params.push('-RStemplate', project.settings.renderSettings);
            }
            if (MULTICORE) {
                params.push('-RStemplate',  "\"Multi-Machine Settings\"");
            }

            if (project.settings.startFrame && !MULTICORE) {
                params.push('-s', project.settings.startFrame);
            }

            if (project.settings.endFrame && !MULTICORE) {
                params.push('-e', project.settings.endFrame);
            }

            if (project.settings.incrementFrame && !MULTICORE) {
                params.push('-i', project.settings.incrementFrame);
            }
        }

        if (process.env.AE_MULTIFRAMES && !MULTICORE) {
            params.push('-mp');
        }

        if (process.env.AE_LOG && process.env.AE_LOG.length > 0) {
            params.push('-log', process.env.AE_LOG);
        }

        if (process.env.AE_MEMORY && process.env.AE_MEMORY.length > 0) {

            // if mem_usage have wrong format
            if (process.env.AE_MEMORY.indexOf(' ') === -1) {
                return reject( new Error('Wrong memory format') );
            }

            // split by space and prase int's
            let memcomps = process.env.AE_MEMORY.split(' ');
            let image_cache_percent = parseInt(memcomps[0]) || 50;
            let max_mem_percent     = parseInt(memcomps[1]) || 50;

            // pass params
            params.push('-mem_usage', image_cache_percent, max_mem_percent);
        }

        // spawn process and begin rendering (on multiple cores seperately)
        let cores =  Array.apply(null, {length: CORES}).map(Number.call, Number)
		    cores.shift()
        const RENDER_ALL_FRAMES_ON_SINGLE_CORE = false
        return Promise.all(
          cores.map((core) => renderOnCore(project, params, core, MAX_TRIES, RENDER_ALL_FRAMES_ON_SINGLE_CORE))
		    );

    });
};

let project = {
  composition: "Main",
  settings: {
    outputExt: "jpg", //jpg
    outputModule: "JPEGSeq", //JPEG
    renderSettings: "",
    startFrame: 0,
    endFrame: 7192,
    incrementFrame: 0
  },
  workpath: "C:\\Users\\apjagaciak\\Documents\\code\\trapnationrender-prod",
  //workpath: "/Users/alex/Documents/code/current/trapnationrender/apiserver/api/",
  template: "assets\\TA_TrapNation_Default.aepx",
  resultname: "",
  uid: "1111"
}

//TEST Multicore Rendering
render(project)
.then( (res) => {
  console.log(res)
})
.catch( (err) => {
  console.log(err)
})


/*
//TEST Deleting
let params = []
let aedata = []
let core = 2
let maxrecursion = 0
let folder = project.workpath + "temp"
deleteZeroSizeFrames(folder)
.then(renderMissingFrames(project, params, core, maxrecursion))
.then( (res) => resolve( project ))
.catch( (err) => {
  aedata.push(err);
  console.log( aedata.join('') )
})
*/
