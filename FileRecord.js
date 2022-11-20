let debug=false;
const SHARED = require('./sharedFunctions');
const { v4: uuidv4 } = require('uuid');
const READIMAGE = require('readimage');
const PDF = require('pdf-to-png-converter');
const FS = require('fs');
const TOR = require('@mich4l/tor-client');
const tor = new TOR.TorClient({socksHost:'127.0.0.1', socksPort:9050});

//Might be safe to remove these.
const IMAGESYNC = require('image-sync');
const MYREQUESTS = require('./myRequests');


class FileRecord {

    #record ;
    constructor(file_record) {
        this.#record = file_record;

        if(typeof(file_record) == 'string') {
            this.link = file_record;
        }
        else {
            this.#record = file_record;
        } 
        
        this.#uuid = uuidv4().toString();
    }

    #uuid
    get uuid() {
        return this.#uuid;
    }

    #url;
    get url() {
        if(this.#url == undefined)
            this.#url = this.#record.link;
        return this.#url
    }

    #name
    get name() {
        if(this.#name == undefined){
            this.#name = this.#uuid + "-" + SHARED.replaceAll(this.fileName," ","_");
        }
        //if(debug){console.log("Name: ", this.#name)}
        return this.#name
    }

    #size;
    get size() {
        if(this.#record.size == undefined){
            this.size = "UNKNOWN"
        }
        else{
            //this.#size = this.#record.size;
            let sizeAsString = this.#record.size;
            let s = sizeAsString.replace("K", " K");
            s = s.replace("M", " M");
            s = s.replace("G", " G");
            s = s.replace("  ", " ");
        
            s = s.split(" ");
        
            let size = parseFloat(s[0]);
            let multiplier = 'b';
            if(s.length>1) multiplier = s[1].toString();
        
            switch(multiplier.toLowerCase()){
                case "kib":
                case "kb":
                case "k":
                    multiplier = 1024;
                    break;
                case "mib":
                case "mb":
                case "m":
                    multiplier = (1024 * 1024);
                    break;
                case "gib":
                case "gb":
                case "g":
                    multiplier = (1024 * 1024 * 1024);
                    break;
                default:
                    multiplier = 1;
                break;
            }
            this.#size = size * multiplier;
        }
        return this.#size
    }

    #date
    get date() {
        if(this.#record.date == undefined){
            this.#date = "UNKNOWN"
        }else{
            this.#date = this.#record.date
        }

        return this.#date
    }

    #fileName
    get fileName() {
        if(this.#fileName == undefined) {
            this.#fileName = SHARED.getFileNameFromUrl(this.url)
        }
        return this.#fileName
    }
    set fileName(_value) {
        if(_value){
            this.#fileName = _value;
        }
    }

    #extension
    get extension(){
        let ext = SHARED.getFileExtention(this.fileName);
        //if(debug){console.log("Ext: ", ext)}
        return ext
    }
    
    #data ; 
    get data() {
        if(this.#data == undefined) {
            return this.#download().then(path=> {
                this.#data = Buffer.from(FS.readFileSync(path));
                return this.#data;
            })
        }
        else {
            return this.#data
        }
    }

    #images
    get images() {
        let debug = true;
        debug?console.log("fileRecord.images()"):false;

        if(this.#images == undefined) {
            debug?console.log("getting images."):0
            return this.#getImages().then((foundImages) => {
                this.#images = foundImages;
                return this.#images;
            })
        } else {
            debug?console.log("returning images."):0
            return this.#images
        }
        
    } 
 
    /**returns the promise of [images] 
     * {
        height: 100, // pixels
        width: 100, // pixels
        frames: [
                    {
                        data: ... // RGBA buffer
                        delay: 100 // milliseconds before switching to next frame. OPTIONAL
                    },
                    {
                        data: ...
                        delay: 10
                    }
                ]
        }
    */
    async #getImages(){
        let debug = true;
        debug?console.log("#getImages()"):0;

        if(this.#images == undefined) {
            let outputMask = this.name;
            let outputFolder = "./downloads"
            let options = {
                disableFontFace: false, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
                useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
                viewportScale: 1, // The desired scale of PNG viewport. Default value is 1.0.
                //outputFolder: outputFolder, // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
                outputFileMask: outputMask, // Output filename mask. Default value is 'buffer'.
                //pdfFilePassword: 'pa$$word', // Password for encrypted PDF.
                //pagesToProcess: [1,2,3,4,5,6,7,8,9,10],   // Subset of pages to convert (first page = 1), other pages will be skipped if specified.
                strictPagesToProcess: false, // When `true`, will throw an error if specified page number in pagesToProcess is invalid, otherwise will skip invalid page. Default value is false.
                verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
            }

            debug?console.log("\tdownloading PDF data."):0;

            let downloaded_data = await this.data;
            debug?console.log("\tgot pdf."):false;
            let pages = [];             
            try { 
                pages = await PDF.pdfToPng(downloaded_data,options)
            }catch(e){
                console.log(e)
            }
            
            debug?console.log("\t\t(",pages.length,"pages)"):0
            
            let foundImages = []
            if(pages.length > 0) {
                for(let p = 0; p < pages.length; p++) {
                    let page = pages[p];
                    debug?console.log(page):0
                    debug?console.log(Buffer.from(page.content)):0
                    //let image = IMAGESYNC.read(page.path);
                    let image = await new Promise((resolve,reject) => {
                        READIMAGE(Buffer.from(page.content),(err,_imageData) => {
                            if(err){
                                console.log("\t-> ! <-");
                                console.log(err);
                                reject(err)
                            }else{
                                debug?console.log("image found."):0
                                _imageData.image = page.content;
                                resolve(_imageData);
                            }
                        })
                    })
                    foundImages.push(image);
                }
                return foundImages;
            } else {
                return [];
            }
        }
    }

    #numFaces
    async numFaces() {
        let debug = true;
        debug?console.log("fileRecord.numFaces()"):false;

        const DETECTOR = require("face-detector-self-contained");
        
        //const IMAGEINFO = require('imageinfo')

        let facetally = 0;
        if(this.#numFaces == undefined) {
            let these_images = await this.images;
            debug?console.log("Images to check: ",these_images.length):0;
            for(let i = these_images.length; i >= 0; i--){
                
                let thisImage = these_images[i];
                
                debug?console.log(thisImage):0
                
                let image = thisImage.frames[0].data;
                //let image = thisImage.data;
                let h = thisImage.height;
                let w = thisImage.width;
                let faceResults = DETECTOR.runFaceDetector(image,w,h);
                
                debug?console.log("face results:"):0
                debug?console.log(faceResults):0
                
                if(faceResults == undefined){
                    this.images.splice(i,1)
                }

                facetally += faceResults.length;
            }
            return facetally;
        
        } else {
            debug?console.log("returning previously found images."):0
            return this.#numFaces
        }
        
    }

    report() {
        console.log("\t-> REPORT <-");
        console.log("\tUUID: \t",this.name);
        console.log("\tSize: \t",this.size,"(",this.#record.size,")");
        console.log("\tFilename:", this.#fileName)
        console.log();
    }

    async #download(){
        let debug=true;
        if(!FS.existsSync("./partials")) FS.mkdirSync("./partials");
        if(!FS.existsSync("./downloads")) FS.mkdirSync("./downloads");
        if(!FS.existsSync("./candidates")) FS.mkdirSync("./candidates");
        return new Promise(async(resolve,reject) => {
            
            let destDirectory = "./downloads";
            let dloptions = {
                filename:this.name,
                dir:destDirectory
            }
            
            let result;
            debug?console.log("\tdownloading"):false;
            try {
                result = await tor.download(this.url,dloptions);
            } catch(e) {
                console.log(e);
                console.log("download failed. retrying...")
                result = this.#download();
            }
            debug?console.log("\tdownload complete."):false;

            resolve(result) ;
        
        })
    }
}

module.exports = {
    FileRecord : FileRecord
}