/******************/
/*****CONFIG******/
/****************/

module.exports = {
	/**** !!!CHANGE!!! ****/
	// On Windows might look like: 'C:\\Program Files\\Adobe\\After Effects CC\\aerender.exe'
	aebinary: 		"/Applications/Adobe\ After\ Effects\ CC\ 2019/aerender", // (CHANGE) path to AERender executable
	// The default outputModule for Windows users is "Lossless" & the default outputExt is "avi"
    // You can create custom modules from Edit -> Templates -> Output Modules but the name and outputExt have to be in sync
    // Go to Composition -> Add Output Module to create customModule names
    // https://helpx.adobe.com/after-effects/using/basics-rendering-exporting.html#output_modules_and_output_module_settings
	outputModule: 	"QuicktimeLossless",				// (CHANGE) must exist as output template in AE
	outputExt: 		"mov",								// (CHANGE) depends on output template

	/**** LEAVE DEFAULT ****/
	assetsPath: 	"assets/",							//folder containing the asset files below
	mixfile: 		"song.mp3",
	audioExt: 		"mp3",
	background: 	"background.jpg",
	cover: 			"cover.jpg",
	datascript: 	"keyframes.txt",
	aepxfile: 		"TrapNationTemplateAutomated.aepx",

	port:    		23234,								//file server port
	FPS: 			30, 								//FPS (frames per seconds)
	duration: 		60 									//(in FPS) leave at 0 for entire audio length
}
