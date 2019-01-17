/******************/
/*****CONFIG******/
/****************/

module.exports = {
	/**** ADJUST****/

	aebinary: 			"/Applications/Adobe\ After\ Effects\ CC\ 2019/aerender", // (ADJUST) path to AERender executable
	// The default outputModule for Windows users is "Lossless" & the default outputExt is "avi"
  // You can create custom modules from Edit -> Templates -> Output Modules but the name and outputExt have to be in sync
  // https://helpx.adobe.com/after-effects/using/basics-rendering-exporting.html#output_modules_and_output_module_settings
	outputModule: 	"QuicktimeLossless",// (ADJUST) must exist as output template in AE
	outputExt: 			"mov",							// (ADJUST) depends on output template

	/**** LEAVE DEFAULT ****/
	assetsPath: 		"assets/",					//folder containing the asset files below
	mixfile: 				"song.mp3",
	audioExt: 			"mp3",
	background: 		"background.jpg",
	cover: 					"cover.jpg",
	datascript: 		"keyframes.txt",
	aepxfile: 			"TA_TrapNation_Default.aepx",
	port:    				23234,							//file server port
	FPS: 						30, 								//FPS (frames per seconds)
	duration: 			0 									//(in FPS) leave at 0 for entire audio length
}
