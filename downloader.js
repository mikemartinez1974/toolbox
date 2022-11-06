
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const pdf = require('pdf-to-png-converter')
const FS = require('fs');
const PATH = require('path');
const { v4: uuidv4 } = require('uuid');
eval(FS.readFileSync('c:/users/michael/documents/sourcecode/utils/utils.js')+'');
eval(FS.readFileSync('c:/users/michael/documents/sourcecode/utils/utils.js')+'');
eval(FS.readFileSync('c:/users/michael/documents/sourcecode/data/DataTools.js')+'');
eval(FS.readFileSync('sharedFunctions.js')+'');

//tor.TorControlPort.password = '[Tor521]';

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

const myArgs = process.argv.slice(2);
let task = myArgs[0] || "downloader";
let taskfile = task + ".txt";


const minSize = 50000;
const maxSize = 10000000;

async function getNextTask(){
        
    let record = null;
    if(FS.existsSync(taskfile)){
        record = JSON.parse(FS.readFileSync(taskfile)).link;
        record.uuid = uuidv4();
    } else {
        let id = 0;
        let recordset = await execute("call pp_search.nextfile;");
        let record = recordset[0][0];
        if(!record) return "EOF";
    }
    return record;
}

function isTargetSize(sizeAsString){
    let s = "";
    s = sizeAsString.replace("K", " K");
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
    if((size < minSize) || (size > maxSize)) return false;
    return true;
}

function isTargetExtention(filename){
    let extention = getFileExtention(filename);
    return candidateExtentions.includes(extention)
}

function convertPDF(bufferOrFile,format = "png") {
	format = format.toLowerCase();
	//let filename = PATH.basename(path);
	//let ext = PATH.extname(path)
	//let outputMask = filename.replace(ext, "");
	let outputdir = path.substr(0,path.length - filename.length);
    
	console.log("\t- Converting to " + outputMask + ".png");
	try{
     	let error = null;
     	let images = pdf.pdfToPng(bufferOrFile, // The function accepts PDF file path or a Buffer
     	{
          	disableFontFace: true, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
          	useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
          	viewportScale: 1, // The desired scale of PNG viewport. Default value is 1.0.
          	//outputFolder: outputdir, // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
          	//outputFileMask: outputMask, // Output filename mask. Default value is 'buffer'.
          	//pdfFilePassword: 'pa$$word', // Password for encrypted PDF.
          	pagesToProcess: [1, 2, 3, 4, 5],   // Subset of pages to convert (first page = 1), other pages will be skipped if specified.
          	strictPagesToProcess: false, // When `true`, will throw an error if specified page number in pagesToProcess is invalid, otherwise will skip invalid page. Default value is false.
          	verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
     	}).catch(()=>{
          	error = "Invalid PDF." 
          	console.log("\t * " + error);
     	})

     	if(!error){
          	return [];
     	}
     	else {
     		return images;
     	}
        
	} catch(e)
	{
     	console.log(e);
     	return [];
	}
}

async function download(record){
    return new Promise((resolve,reject) => {
        
        record.data = null;
        record.data = makeRequest(record.link)
            .then(() => { 
                resolve(record) })
            .catch((reason) => {
                let message = "\t Error - " + reason + ". Retrying...";
                console.log(message);
            })
    })
}

const candidateExtentions = ["tiff","tif","jpg","jpeg","png","bmp","gif","pdf"];

async function processRecord(record) {
    return new Promise((resolve, reject) => {
        
        link = record.link;
        
        //decide what to do with the file here.
        if(isTargetSize(record.size)){
            FS.writeFileSync(taskfile,record)
            
            let ext = getFileExtention(filename)
            
            if(!candidateExtentions.includes(ext)) reject("\tRejected - " + record.file + " - wrong filetype.")

            switch(ext) {
                case "pdf":
                    download(record)
                        .then(() => { processPdf(record) } )
                        .then(resolve(record));

                    break;

                case "sql":
                case "csv":
                case "txt":
                    download(record)
                        .then(processTxt(record))
                        .then(resolve(record))

                    break;

                case "xls":
                case "xlsx":
                    download(record).then(processXls(record))
                    .then(resolve(record))
                    break;

                default:
            }

        }
        else
        {
            let reason = "\tRejecing " + record.file + " - wrong size."
            reject(reason);
        }

    })
}

(async () => {
    
    let nextRecord = {file:"EOF",link:"EOF"}
    if(myArgs.length > 1) {
        let a = myArgs[1].trim();
        nextRecord.file = getFileNameFromUrl(a)
        nextRecord.link = a;
    }
    else
    {
        nextRecord = await getNextTask();
    }
    
    while (nextRecord != "EOF"){
    
        try {
            await processRecord(nextRecord)
        }
        catch(reason) {
            console.log(reason);
        }
        //delete current task and get a new one.
        if(FS.existsSync(taskfile)) FS.unlinkSync(taskfile);          
        nextRecord = await getNextTask();
    }
})();
