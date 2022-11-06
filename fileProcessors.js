const FS = require('fs');
const LINEREADER = require('linereader');
const DETECTOR = require('face-detector-self-contained');
const IMGSYNC = require('image-sync');
const pdf = require('pdf-to-png-converter')
const _ = require('lodash');
eval(FS.readFileSync('sharedFunctions.js')+'');

const ssnRX = RegExp("^(?!666|000|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0{4})\\d{4}$","ig");
const ssnHeaderRX = RegExp("\\b(ssn|ss|social security|soc([\\s\\.-]{1,2})sec)\\b","ig");

// record = {
//     uuid: uuidv4
//     name: <string>,
//     size: <string>,
//     date: <string>,
//     link: <string>,
//     data: <buffer>,
//     images: Array of {   //'images' is an array of imageinfo.
//                  name: string; // PNG page name in a format `{pdfFileName}_page_{pdfPageNumber}.png`,
//                  content: Buffer; // PNG page Buffer content
//                  path: string; // Path to the rendered PNG page file (empty string and if outputFilesFolder is not provided)
//                  faces: Array of [y,x,size,score]
//              }
// }

async function processData(record){}

async function processText(record) {
    return new Promise((resolve,reject) => {

        let result = {};
        result.ssn = 0;
        result.ssnHeader = 0;
        
        const LineReader = new LINEREADER(filename);
        LineReader.on('error', function (err) {
            reject(err);
            LineReader.close();
        });
          
        LineReader.on('line', function (lineno, line) {
            LineReader.pause();
            
            //Do something here.
            let ssnFound = line.match(ssnRX).length;
            result.ssn += ssnFound;

            //Do more stuff here.
            let ssnHeaderFound = line.match(ssnHeaderRX).length;
            result.ssnHeader += ssnHeaderFound;

            LineReader.resume();
        });
          
        LineReader.on('end', function () {
            resolve(result);
        });

    })
    
}

async function processXls(record){

}

async function processPdf(record){
    return new Promise((resolve,reject) =>{
        record = convertPDF(record);
        
        //Are there any images?
        if(record.images.length > 0) {
            let numImgs = record.images.length;

            //scan them for faces.
            for(let i = 0; i < numImgs; i++)
            {
                record.images = detectFaces(record.images);
            }

            //What do we do now....
            //what we are doing right now is just saving the image

            saveImagesToDisc(record);

            resolve(record);
        }
        else {
            reject("No images found.")
        }
    })
}

/** Returns an array of info for positive facematches. */
function detectFaces(imageInfo){
    let results;

    for(let i = 0; i < imageInfo.length; i++) {

        try{
            let img = IMGSYNC.read(imageInfo[i].content);
            let faceResults = DETECTOR.runFaceDetector(img.data,img.width,img.height);
            for(let i = 0; i < faceResults.length; i++){
                if(faceResults[i].length > 0 ){
                    imageInfo.faces.push(faceResults[i])
                } 
            }
        }   
        catch(e)
        {
            imageInfo.faces = [];
        }
    }
    
    return imageInfo
}

function convertPDF(record) {
	
	let convertedImages;
    let outputMask = record.uuid;

	try{
     	let error = null;
     	convertedImages = pdf.pdfToPng(record.data, // The function accepts PDF file path or a Buffer
     	{
          	disableFontFace: false, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
          	useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
          	viewportScale: 1, // The desired scale of PNG viewport. Default value is 1.0.
          	//outputFolder: outputdir, // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
          	outputFileMask: outputMask, // Output filename mask. Default value is 'buffer'.
          	//pdfFilePassword: 'pa$$word', // Password for encrypted PDF.
          	pagesToProcess: [1,2,3,4,5,6,7,8,9,10],   // Subset of pages to convert (first page = 1), other pages will be skipped if specified.
          	strictPagesToProcess: false, // When `true`, will throw an error if specified page number in pagesToProcess is invalid, otherwise will skip invalid page. Default value is false.
          	verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
     	}).catch((e)=>{
            record.images = [];
            return record;
     	})

        if(_.isArray(convertedImages)) {
            for(let i = 0; i < convertedImages.length; i++) {
                record.images.push(convertedImages[i]);
            }

        }else{
            record.images.push(convertedImages);
        }

     	return record;
        
	} catch(e)
	{
     	record.images = [];
        return record;
	}
}

function saveImagesToDisc(record) {
    if(!FS.existsSync("./partials")) FS.mkdirSync("./partials");
    if(!FS.existsSync("./downloads")) FS.mkdirSync("./downloads");
    if(!FS.existsSync("./candidates")) FS.mkdirSync("./candidates");

    const images = record.images;
    for(let i = 0; i < images.length; i++) {
        FS.writeFileSync("./downloads/" + images[i].name + ".png",images[i].content)
    }
}

function saveRecodToDisk (

)