'use strict';

const child_process = require('child_process');
const path          = require('path');
const fs            = require('fs');

// add ability to override
let spawn = child_process.spawn;
let exec = child_process.exec;

let MULTICORE = true
let CORES = 8 //64 for jpeg
//MAC_CORES - 1. leave one physical core (ideally CPU0) for scheduling etc. see shift() later
let MAX_TRIES = 1
let AE_BINARY = "\"%AERENDER%\""
let TEMP_FOLDER = "\\temp\\"

let THE_FOLDER = "C:\\Users\\apjagaciak\\Documents\\code\\trapnationrender-prod\\temp\\sXH4_qbv4"+TEMP_FOLDER

function deleteZeroSizeFrames(folder, callback){
  return new Promise((resolve, reject) => {
    fs.readdir(folder, function (err, files) {
      if (err) return reject(err);

      files.forEach(function (file, index) {
        // Make one pass and remove empty files
        var fromPath = path.join(folder, file);

        fs.stat(fromPath, function (err, stat) {
          if (err) return reject(err);

          if (stat.isFile()) {
            let fileEmpty = stat.size == 0
            if(fileEmpty){
              //TODO: Potential problem if other thread is writing that file
              fs.unlink(fromPath, (err) => {
				console.log("Deleted file: "+ fromPath)
                if (err) return reject(err);
              });
            }
          }

        });
      });
	  resolve();
    });

  });
}

function renderMissingFrames(project, params, core, maxrecursion){
	return new Promise((resolve, reject) => {
	  fs.readdir(THE_FOLDER, (err, files) => {  //TODO project.workpath + TEMP_FOLDER
		console.log("checking Missing files. File.length: "+ (files.length - 1) + "endFrame: " + Math.floor(project.settings.endFrame))
		if (err) return reject(err);
		const RENDER_ALL_FRAMES_ON_SINGLE_CORE = true;
		return ((files.length - 1) == Math.floor(project.settings.endFrame)) ? resolve() : resolve( renderOnCore(project, params, core, maxrecursion, RENDER_ALL_FRAMES_ON_SINGLE_CORE));
	  });
	})
}


function renderOnCore(project, params, core, maxrecursion, renderAllFrames){
  if(renderAllFrames) {
	  console.log("Missing frames detected!")
  }
  const DELAY = (!renderAllFrames && maxrecursion == MAX_TRIES) ? core * 2000 : 0; //Delay for first initiation when all cores are started simoultanoussly

    return new Promise((resolve, reject) => {
      let aedata = []
      var isWin = process.platform === "win32";
      if(!isWin){
        return reject( "OS unsupported for multicore processing" )
      }
      let coreSelector = "start \"\" /affinity";
      let frameBoundaries = "-s " + project.settings.startFrame + " -e " + project.settings.endFrame
      if(!renderAllFrames){
        let partToRender = core - 1; //because we avoid using CPU0
		let USED_CORES = CORES - 1;
        frameBoundaries = "-s " + Math.ceil((project.settings.endFrame/USED_CORES)*partToRender).toString() + " -e " + Math.floor((project.settings.endFrame/USED_CORES)*(partToRender+1)).toString()
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
		  if (code !== 0) {
			console.log("CPU" + core + "failed. Maxrecursion" + maxrecursion)
			return (maxrecursion > 0) ? renderOnCore(project, params, core, maxrecursion-1, renderAllFrames) : reject( aedata.join('') )
		  } else {
			  if(maxrecursion > -1) {
				  console.log("CPU" + core + "succeeded. Maxrecursion" + maxrecursion)
				  maxrecursion = (renderAllFrames) ? maxrecursion : MAX_TRIES  //after finishing with partial workload, give the process MAX_TRIES again to render up missing frames (before renderAllFrames (missing frame filling) is initiated
				  let folder = THE_FOLDER//project.workpath + TEMP_FOLDER //TODO remove temp
				  deleteZeroSizeFrames(folder)
				  .then(renderMissingFrames(project, params, core, maxrecursion - 1))
				  .then( (res) => resolve( project ))
				  .catch( (err) => {
					aedata.push(err);
					reject( aedata.join('') )
				  })
			  } else {
				aedata.push("Max tries for rendering missing frames exceeded");
				reject( aedata.join('') )
			  }
		  }
      });
    })
}

/**
 * This task creates rendering process
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        console.info(`[${project.uid}] rendering project...`);
		
		let newTempPath = path.join( process.cwd(), project.workpath, TEMP_FOLDER)
		!fs.existsSync(newTempPath) && fs.mkdirSync(newTempPath);

        // create container for data and parameters
        let aedata = [];
        let params = [];

        let outext = (project.settings && project.settings.outputExt) ? project.settings.outputExt : 'mp4';

        // set default project result file name
        project.resultname = TEMP_FOLDER + 'result' + '.' + outext;

        // NOTE: for still (jpg) image sequence frame filename will be changed to result_[#####].jpg
        // NOTE: if you want to change this field, also goto actions/copy-to-results.js, and apply changes there too
        if (project.settings &&
            project.settings.outputExt &&
            ['jpeg', 'jpg'].indexOf(
                project.settings.outputExt.toLowerCase()
            ) !== -1
        ) {
            project.resultname = THE_FOLDER + 'result_[#####]' + '.' + outext;
        }

        // setup parameters
        params.push('-comp',        project.composition);
        params.push('-project',     path.join( process.cwd(), project.workpath, project.template ));
        params.push('-output',      project.resultname/*path.join( process.cwd(), project.workpath, project.resultname )*/);

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
        let results = Promise.all(cores.map((core) => renderOnCore(project, params, core, MAX_TRIES, RENDER_ALL_FRAMES_ON_SINGLE_CORE)))
		results
		.then(res => {console.log(res); resolve (project) })
		.catch(err => reject(err) )
		 

    });
};
