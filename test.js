
const pdf = require('pdf-to-png-converter')
const fs = require('fs');
const _ = require('lodash');
const DETECTOR = require('face-detector-self-contained');
const util = require('util');

let file = "sample.pdf";
let imageSampleFile = "sample.png";
let data = fs.readFileSync(file)

let IMAGEINFO = require('imageinfo');

convertPDF(file);

async function convertPDF(data) {
	return new Promise(async (resolve,reject) => {
        //console.log("converting...");
        let convertedImages;
        let outputMask = "pdfFile";
        let images = [];
        let outputdir = "./"
        let options = {
            disableFontFace: false, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
            useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
            viewportScale: 1, // The desired scale of PNG viewport. Default value is 1.0.
            //outputFolder: outputdir, // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
            //outputFileMask: outputMask, // Output filename mask. Default value is 'buffer'.
            //pdfFilePassword: 'pa$$word', // Password for encrypted PDF.
            pagesToProcess: [1,2,3,4,5,6,7,8,9,10],   // Subset of pages to convert (first page = 1), other pages will be skipped if specified.
            strictPagesToProcess: false, // When `true`, will throw an error if specified page number in pagesToProcess is invalid, otherwise will skip invalid page. Default value is false.
            verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
        }

        convertedImages = await pdf.pdfToPng(data,options)
        .then(
            (data)=>{
                //imagesRecevied(convertedImages,record);
                if(_.isArray(data)) {

                    for(let i = 0; i < data.length; i++)
                    {
                        let imgData = data[i].content;
                        console.log(data[i]);
                        let imginfo = IMAGEINFO(imgData);
                        console.log('Width = ' + imginfo.width);
                        console.log('Height = ' + imginfo.height);
                        //fs.writeFileSync("sample.png",imgData);
                        //main(imgData).then(console.log).catch(console.error);
                    }
                    
                    resolve();
                }else{
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




const ImageDimensionsStream = require('image-dimensions-stream');
const { clearScreenDown } = require('readline');
const pipeline = util.promisify(require('stream').pipeline);

async function main(filename,callback) {
  const sizeStream = new ImageDimensionsStream();
  let result = {
    mime: null,
    dimensions: null,
  };

  sizeStream.on('mime', (mime) => {
    result.mime = mime;
    if(result.dimensions != null ) callback(result)
  });

  sizeStream.on('dimensions', (dimensions) => {
    result.dimensions = dimensions;
    if(result.mime != null ) callback(result)
  });

  //*******
    let b = fs.createReadStream(filename);
    //let b = fs.createReadStream(filename);
    //let b = new ReadableStream(fs.readFileSync(filename));
    //let b = new ReadableStream(filename)
  //*******

  await pipeline(b, sizeStream);
}

// main(imageSampleFile,(result) => {
//     console.log(result.dimensions);
// });


//////////////////////////////////////////////
//          THIS WORKS                      //
//////////////////////////////////////////////


// async function main(filename,callback) {
//     const sizeStream = new ImageDimensionsStream();
//     let result = {
//       mime: null,
//       dimensions: null,
//     };
  
//     sizeStream.on('mime', (mime) => {
//       result.mime = mime;
//       if(result.dimensions != null ) callback(result)
//     });
  
//     sizeStream.on('dimensions', (dimensions) => {
//       result.dimensions = dimensions;
//       if(result.mime != null ) callback(result)
//     });
  
//     await pipeline(fs.createReadStream(filename), sizeStream /*, fs.createWriteStream('/dev/null')*/);
//   }
  
//   main(imageSampleFile,(result) => {
//       console.log(result.dimensions);
//   });