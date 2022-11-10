const debug = true;

const FS = require('fs');
const LINEREADER = require('linereader');
const DETECTOR = require('face-detector-self-contained');
const IMGSYNC = require('image-sync');
const READIMAGE = require('readimage')
const pdf = require('pdf-to-png-converter')
const _ = require('lodash');
const URL = require('url');

const { assert } = require('console');
const IMAGEINFO = require('imageinfo');
eval(FS.readFileSync('sharedFunctions.js')+'');
const WEBREQUESTS = require('./myRequests.js');

const ssnRX = RegExp("^(?!666|000|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0{4})\\d{4}$","ig");
const ssnHeaderRX = RegExp("\\b(ssn|ss|social security|soc([\\s\\.-]{1,2})sec)\\b","ig");





async function download(record){
    return new Promise(async (resolve,reject) => {
        let link = record.link.toString();
        //let link = "http://nxvvamxmbdn3latdplq6azgeeuieaek32h674nl6lzavcod2f2obvxyd.onion/gmi3.com/HR/GMI%20Personnel%20Files/1-ACTIVE%20Employees%20Files%20%28GMI%29/Dillon%2C%20Shannon%20%28Ashleigh%29%20DOH%208-21-17/Dillon%20Driver%20License.pdf";
        
        let filename = getFileNameFromUrl(link)
        //record.data = null;
        console.log("downloading...");

        await makeRequest(link,false,false)
        .then((data) => { 
            record.data = new Buffer.from(data);
            console.log("downloaded: " + record.data.length);
            //console.log(record);
            resolve(record)
            }
        )
    })
}

// async function processPdf(record){
//     return new Promise(async (resolve,reject) =>{
        
//         console.log("processing pdf " + record.uuid);     
//         await convertPDF(record).then(
//             (_record) => {
//                 let numImgs = _record.images.length;
//                 for(let i = 0; i < numImgs; i++)
//                 {

//                     let pdfpage = record.images[i];
//                     let imginfo = IMAGEINFO(pdfpage.content);
//                     console.log("here?");
//                     pdfpage.width = imginfo.width;
//                     pdfpage.height = imginfo.height;
//                     detectFaces(pdfpage,(results)=>{
//                         pdfpage.faces = results;
//                     });
//                 }
                
//                 resolve(_record);
//             },
//             (reason) =>{
//                 reject(reason);
//             })
        
//         //console.log(record);
        
//     })
// }

const processPdf = async function(record){
    return new Promise(async (resolve,reject) =>{
        
        console.log("processing pdf " + record.uuid);     
        await convertPDF(record).then(
            (_record) => {
                let numImgs = _record.images.length;
                for(let i = 0; i < numImgs; i++)
                {

                    let pdfpage = record.images[i];
                    let imginfo = IMAGEINFO(pdfpage.content);
                    console.log("here?");
                    pdfpage.width = imginfo.width;
                    pdfpage.height = imginfo.height;
                    detectFaces(pdfpage,(results)=>{
                        pdfpage.faces = results;
                    });
                }
                
                resolve(_record);
            },
            (reason) =>{
                reject(reason);
            })
        
        //console.log(record);
        
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
function detectFaces(imageInfo,callback){

    console.log('In detect faces.');

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
        callback(results);
    })        
    
}

async function convertPDF(record) {
	return new Promise(async (resolve,reject) => {
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

        let data = record.data;
        //console.log(record);
        //data = FS.readFileSync("sample4.pdf");

        let imageArray;        
        try { imageArray = await pdf.pdfToPng(Buffer.from(data),options) }
        catch(e) { reject(e.message) }
        
        if(imageArray == undefined) {
            reject('No Images Found');
        }
        else
        {
            console.log("<-")
            record.images = imageArray;
            resolve(record);
        }              
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




module.exports = {
    processPdf: 
}