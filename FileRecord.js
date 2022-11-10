
const SHARED = require('./sharedFunctions');
const { v4: uuidv4 } = require('uuid');

class FileRecord {

    #record ;
    constructor(file_record) {
        if(typeof(file_record) == 'string') {
            this.link = file_record;
        }
        else {
            this.#record = file_record;
        } 
        
        this.#uuid = new uuidv4().toString();
    }

    
    #uuid ;
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
        if(this.#name == undefined)
            this.#name = this.uuid.toString() + ":" + this.fileName;
        return this.#name
    }

    #size = this.#record.size;
    get size() {
        if(this.#record.size == undefined)
            this.size = "UNKNOWN"
        else
            this.size = this.#record.size;
    }

    #date = this.#record.date;
    get date() {
        if(this.#date == undefined){
            if (this.#record.date == undefined)
                this.#date = "UNKNOWN"
            else{
                this.#date = this.#record.date
            }
        }
        return this.#date
    }
    
    fileName = SHARED.getFileNameFromUrl(this.url)
    
    #data ; 
    get data() {
        if(this.#data == undefined) {
            this.#data = this.#get_data()
        }
        return super.this.#get_data()
    }

     async #get_data() {
        if (this.#data == undefined) {
            this.#data = await download(this.url)
        }
        return this.#data
        
    }

    #images 
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
    async images(){
        const READIMAGE = require('readimage');
        return new Promise(async (resolve,reject) => {
            if(this.#images == undefined) {
                let outputMask = this.name;
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
                let downloaded_data = this.data;    
                try { 
                    let pages = await pdf.pdfToPng(downloaded_data,options)
                    for(let page of pages){
                        let imageData = await READIMAGE(pages[page].content,
                            (err,_imageData) => {
                                return new Promise((resolve,reject)=>{
                                    if(err) reject(err)
                                    resolve(_imageData)
                                })
                        })
                        this.#images.push(imageData);
                    }
                }
            catch(e) { reject(e.message) }
            } else {
                resolve(this.#images)
            }     
        })
    }

    #numFaces
    async numFaces() {
        const DETECTOR = require("face-detector-self-contained");
        const IMAGEINFO = require('imageinfo')

        if(this.#numFaces == undefined) {
            
            for(image of this.images){
                let imgInfo;
                IMAGEINFO(imageData,(err,info) => {
                    if(err) reject('Error reading image.');
                    imgInfo = info;
                })

                let h = imgInfo.height;
                let w = info.width;
                let faceResults = DETECTOR.runFaceDetector(imageData,w,h);
                this.#numFaces += faceResults.length;
            }
        }
        return this.#numFaces
    }
}

module.exports = {
    FileRecord : FileRecord
}