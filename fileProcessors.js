const debug = true;

const FS = require('fs');
const LINEREADER = require('linereader');
const DETECTOR = require('face-detector-self-contained');
const IMGSYNC = require('image-sync');
const READIMAGE = require('readimage')
const pdf = require('pdf-to-png-converter')
const _ = require('lodash');
const URL = require('url');
const { v4: uuidv4 } = require('uuid');
const { assert } = require('console');
const IMAGEINFO = require('imageinfo');
eval(FS.readFileSync('sharedFunctions.js')+'');
eval(FS.readFileSync('myRequests.js')+'');

const ssnRX = RegExp("^(?!666|000|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0{4})\\d{4}$","ig");
const ssnHeaderRX = RegExp("\\b(ssn|ss|social security|soc([\\s\\.-]{1,2})sec)\\b","ig");

const candidateExtentions = ["tiff","tif","jpg","jpeg","png","gif","pdf","txt","csv"];

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

async function processRecord(record) {
    return new Promise(async (resolve, reject) => {

        //debug?console.log("processRecord(" + record.name + ")"):false;

        let filename =  getFileNameFromUrl(record.link);
        let ext = getFileExtention(filename);
        let goodsize = isTargetSize(record.size);
        let goodext = candidateExtentions.includes(ext)
        link = record.link;
        
        if(goodsize & goodext){
            record.uuid = uuidv4().toString();
            FS.writeFileSync(taskfile,JSON.stringify(record))
            
            debug?console.log("Processing " + record.name + " (" + record.size + ")"):false;
            switch(ext) {
                case "pdf":
                        try {
                            await download(record);
                            await processPdf(record);
                        }
                        catch(e) {
                            console.log(e);
                            //process.exit();
                        }
                        //console.log(record);
                        let totalFaces = 0;
                        let imagecount = record.images.legth;
                        for(let i = 0; i< imagecount ; i++) {
                            totalFaces += image.faces.length;
                        }
                        if(totalFaces > 0){
                            saveImagesToDisc(record);
                            saveRecordToDisc(record);
                        }
                        resolve(record);
                    break;
                case "sql":
                case "csv":
                case "txt":
                    console.log(record.size);
                    download(record)
                        .then(() => { processTxt(record.link) } )
                        .then(() => { resolve(record) } )
                    break;
                case "xls":
                case "xlsx":
                    console.log(record.size);
                    download(record).then(processXls(record))
                    .then(resolve(record))
                    break;
                default:
                    //console.log('got all the way down here.');
                    reject("Unimplemented Filetype.");
            }

        } else {
            console.log(record.name);
            console.log(record.size);
            reject('Wrong size or type.');
        }

    })
}

async function download(record){
    return new Promise(async (resolve,reject) => {
        let link = record.link.toString();
        let filename = getFileNameFromUrl(link)
        //record.data = null;
        console.log("downloading...");

        await makeRequest(link,false,false)
        .then((data) => { 
            let mybuffer = new Buffer(data,"utf-8");
            record.data = mybuffer;
            console.log("downloaded: " + record.data.length);
            //console.log(record);
            resolve(record)
            }
        )
    })
}

async function processPdf(record){
    return new Promise(async (resolve,reject) =>{
        
        console.log("processing pdf " + record.uuid);  
        //console.log(record);    
        await convertPDF(record)
        // data is an array of pdf.pngpageoutput
        let numImgs = record.images.length;
        console.log("Images Found: " + numImgs);
        
        for(let i = 0; i < numImgs; i++)
        {
            let pdfpage = record.images[i];
            let imginfo = IMAGEINFO(pdfpage.content);
            pdfpage.width = imginfo.width;
            pdfpage.height = imginfo.height;
            pdfpage.faces = detectFaces(pdfpage);
        }

        console.log(record);
        resolve(record);
    })
}

async function processTxt(record) {
    return new Promise((resolve,reject) => {

        record.ssn = 0;
        record.ssnHeader = 0;

        const lines = record.data.toString().split('\n');
        for(let i = 0; i < lines.length; i++){
            let ssnFound = lines[i].ToString().match(ssnRX).length;
            record.ssnFound += ssnFound;
            ssnHeaderFound = lines[i].ToString().match(ssnHeaderRX).length;
            record.ssnHeaders += ssnHeaderFound;
        }

        saveRecordToDisc(record);
        resolve(record);
      
    })
    
}

// async function processData(record){}


// async function processXls(record){}

/** Returns an array of info for positive facematches. */
function detectFaces(imageInfo){
    let results = [];
    READIMAGE(imageInfo.content,(err,myImage)=>{
        if (err) {
            console.log("failed to parse the image")
            console.log(err)
            return
        }
        //imageInfo.content = myImage
        let faceResults = DETECTOR.runFaceDetector(myImage.frames[0].data,imageInfo.width,imageInfo.height);
        let numResults = faceResults.length;
        console.log("Faces found: " + numResults);
        for(let i = 0; i < numResults; i++){
            if(faceResults[i].length > 0 ){
                results.push(faceResults[i])
            } 
        }
    })        
    return results;
}

async function convertPDF(record) {
	return new Promise(async (resolve,reject) => {
        //console.log("converting...");
        let convertedImages;
        let outputMask = record.uuid;
        let images = [];
        let options = {
            disableFontFace: false, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
            useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
            viewportScale: 1, // The desired scale of PNG viewport. Default value is 1.0.
            //outputFolder: outputdir, // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
            outputFileMask: outputMask, // Output filename mask. Default value is 'buffer'.
            //pdfFilePassword: 'pa$$word', // Password for encrypted PDF.
            pagesToProcess: [1,2,3,4,5,6,7,8,9,10],   // Subset of pages to convert (first page = 1), other pages will be skipped if specified.
            strictPagesToProcess: false, // When `true`, will throw an error if specified page number in pagesToProcess is invalid, otherwise will skip invalid page. Default value is false.
            verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
        }

        try {
            data = record.data;
            //data = FS.readFileSync("sample4.pdf");
            record.images = await pdf.pdfToPng(data,options);
        }
        catch(e) {
            record.images = [];
            //reject("Invalid PDF Structure.")
        }

        if(record.images == []) reject("No images found/Invalid PDF");
        resolve(record);
    })
}

function imagesRecevied(PngPageOutput,record) {
    console.log("got pix");

    if(_.isArray(PngPageOutput)) {
        record.data = PngPageOutput
    }else{
        images = [PngPageOutput]    
    }

    console.log("find this line");
    console.log(record);
    
    //return images;
}

function saveImagesToDisc(record) {
    console.log("Saving Images");
    if(!FS.existsSync("./partials")) FS.mkdirSync("./partials");
    if(!FS.existsSync("./downloads")) FS.mkdirSync("./downloads");
    if(!FS.existsSync("./candidates")) FS.mkdirSync("./candidates");

    const images = record.images;
    for(let i = 0; i < images.length; i++) {
        FS.writeFileSync("./downloads/" + images[i].name + ".png",images[i].content)
    }
}

function saveRecordToDisc (record) {
    console.log("Saving Record");
    //console.log(record);
    let data = JSON.stringify(record)

    if(!FS.existsSync("./data")) FS.mkdirSync("./data");
    FS.writeFileSync("./data/" + record.uuid + ".json", data);
}

const minSize = 50000
const maxSize = 11000000
function isTargetSize(sizeAsString){
    let s = sizeAsString.toString();
    s = s.replace("K", " K");
    s = s.replace("M", " M");
    s = s.replace("G", " G");
    s = s.replace("  ", " ");

    s = s.split(" ");

    let size = parseFloat(s[0]);
    let multiplier = 'b';
    if(s.length>1) multiplier = s[1].toString().toLowerCase();

    switch(multiplier){
        case "kib":
        case "kb":
        case "k":
            multiplier = 1000;
            break;
        case "mib":
        case "mb":
        case "m":
            multiplier = 100000;
            break;
        case "gib":
        case "gb":
        case "g":
            multiplier = 1000000000;
            break;
        default:
            multiplier = 1;
        break;
    }
    size = size * multiplier;
    if((size < minSize) || (size > maxSize)) {
        return false;
    } else {
        return true;
    }
    
}

function isTargetExtention(filename){
    let extention = getFileExtention(filename);
    return candidateExtentions.includes(extention)
}

// function convertPDF(bufferOrFile,format = "png") {
// 	format = format.toLowerCase();
// 	//let filename = PATH.basename(path);
// 	//let ext = PATH.extname(path)
// 	//let outputMask = filename.replace(ext, "");
// 	//let outputdir = path.substr(0,path.length - filename.length);
    
// 	console.log("\t- Converting to " + outputMask + ".png");
// 	try{
//      	let error = null;
//      	let images = PDF.pdfToPng(bufferOrFile, // The function accepts PDF file path or a Buffer
//      	{
//           	disableFontFace: true, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
//           	useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
//           	viewportScale: 1, // The desired scale of PNG viewport. Default value is 1.0.
//           	//outputFolder: outputdir, // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
//           	//outputFileMask: outputMask, // Output filename mask. Default value is 'buffer'.
//           	//pdfFilePassword: 'pa$$word', // Password for encrypted PDF.
//           	pagesToProcess: [1, 2, 3, 4, 5],   // Subset of pages to convert (first page = 1), other pages will be skipped if specified.
//           	strictPagesToProcess: false, // When `true`, will throw an error if specified page number in pagesToProcess is invalid, otherwise will skip invalid page. Default value is false.
//           	verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
//      	}).catch(()=>{
//           	error = "Invalid PDF." 
//           	console.log("\t * " + error);
//      	})

//      	if(!error){
//           	return [];
//      	}
//      	else {
//      		return images;
//      	}
        
// 	} catch(e)
// 	{
//      	console.log(e);
//      	return [];
// 	}
// }
