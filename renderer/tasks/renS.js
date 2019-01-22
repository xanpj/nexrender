'use strict';

const child_process = require('child_process');
const path          = require('path');

// add ability to override
let spawn = child_process.spawn;
let exec = child_process.exec;

let MULTICORE = true
let CORES = 64 //64 for jpeg
//MAC_CORES - 1. leave one physical core (ideally CPU0) for scheduling etc. see shift() later
let MAX_TRIES = 0
let AE_BINARY = "\"%AERENDER%\""

function renderOnCore(project, params, core, maxrecursion){
  return new Promise((resolve, reject) => {
	let aedata = []
    // -s '+ str(math.ceil((endTime/cores)*i))  +' -e '+ str(math.floor((endTime/cores)*(i+1)))  +'
    var isWin = process.platform === "win32";
    if(!isWin){
      reject( "OS unsupported for multicore processing" )
    }
    let coreSelector = "start \"\" /affinity";
    let frameBoundaries = "-s " + Math.ceil((project.settings.endFrame/CORES)*core).toString() + " -e " + Math.floor((project.settings.endFrame/CORES)*(core+1)).toString()
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
        return renderOnCore(project, params, core, maxrecursion-1)
       } else {
        return (code !== 0) ? reject( aedata.join('') ) : resolve( project );
       }
    });
  })
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
            ['jpeg', 'jpg'].indexOf(
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
        return Promise.all(
          cores.map((core) => renderOnCore(project, params, core, MAX_TRIES))
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
  template: "assets\\TA_TrapNation_Default.aepx",
  resultname: "",
  uid: "1111"
}

render(project)
.then( (res) => {
  console.log(res)
})
.catch( (err) => {
  console.log(err)
})
