const debug = true;

const FS = require('fs');
const LINEREADER = require('linereader');
const DETECTOR = require('face-detector-self-contained');
const IMGSYNC = require('image-sync');
const pdf = require('pdf-to-png-converter')
const _ = require('lodash');
const URL = require('url');
const { v4: uuidv4 } = require('uuid');
const { assert } = require('console');
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
    return new Promise((resolve, reject) => {

        //debug?console.log("processRecord(" + record.name + ")"):false;

        let filename =  getFileNameFromUrl(record.link);
        let ext = getFileExtention(filename);
        let goodsize = isTargetSize(record.size);
        let goodext = candidateExtentions.includes(ext)
        link = record.link;
        
        if(goodsize & goodext){
            record.uuid = uuidv4().toString();
            FS.writeFileSync(taskfile,JSON.stringify(record))
            
            debug?console.log("processRecord(" + record.name + ")"):false;

            switch(ext) {
                case "pdf":
                        console.log(record.size);
                        download(record)
                        .then((record) => {
                            //console.log(record);
                            processPdf(record).then(
                                (record)=>{
                                    console.log("resolved");
                                    resolve(record);
                                },
                                (reason)=>{
                                    console.log(reason)
                                    reject(reason);
                                }).catch((reason)=>{
                                    reject(reason);
                                })
                        })
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
            reject();
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
            //console.log("buffsize=" + data.length);
            //mybuffer = new Buffer.alloc(data.length,data,"utf-8");
            mybuffer = new Buffer(data,"utf-8");
            //console.log(mybuffer);
            //console.log(record);
            record.data = mybuffer;
            console.log("downloaded: " + record.data.length);
            resolve(record)
            }
        )
        
        
    })
}

async function processPdf(record){
    return new Promise(async (resolve,reject) =>{
        
        console.log("processing pdf.");      
        await convertPDF(record).then(
            (data) => {
                
                let record = data;
                
                if(record.images.length > 0) {
                    
                    let numImgs = record.images.length;
                    //console.log ("Images Found:" + numImgs);
                    //console.log(record.data);
                    //scan them for faces.
                    for(let i = 0; i < numImgs; i++)
                    {
                        //console.log(record);
                        record.images[i].faces =  detectFaces(record.images[i].content);
                    }

                    //What do we do now....
                    //what we are doing right now is just saving the image

                    saveImagesToDisc(record);

                    saveRecordToDisc(record);

                    resolve(record);
                } else {
                    //console.log("no images found");
                    reject("No images found.")
                }
            },
            (reason) => {
                reject(reason);
            });
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
    let results;
    console.log(imageInfo);
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

async function convertPDF(record) {
	return new Promise(async (resolve,reject) => {
        console.log("in convert pdf");
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

        convertedImages = await pdf.pdfToPng(Buffer.from(record.data),options)
        .then(
            (data)=>{
                //imagesRecevied(convertedImages,record);
                if(_.isArray(data)) {
                    record.images = data
                    resolve(record);
                }else{
                    //images = [PngPageOutput] 
                    //console.log("no images from converter"); 
                    console.log(data); 
                    reject("No images found") 
                }
            },
            (reason)=>{
                //console.log("rejected: " + reason);
                reject(reason);

            })
            .catch((e)=>{
                reject(e);
            });
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
