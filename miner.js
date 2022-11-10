const debug = true

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;


const PDF = require('pdf-to-png-converter')
const FS = require('fs');
const MYSQL = require('mysql2');
const { getOuterHTML } = require('domutils');
require('c:/users/michael/documents/sourcecode/utils/utils.js');
//eval(FS.readFileSync('c:/users/michael/documents/sourcecode/data/DataTools.js')+'');
const SHARED = require('./sharedFunctions')
const PROCESSOR = require('./fileProcessors');
const MYREQUESTS = require('./myRequests')

const { load } = require('cheerio');

let host = "localhost";
let port = 9999;
let database = "pp_search";
let user = "Mike";
let pass = "[Mysql521]";
let db = MYSQL.createConnection({"host":host,"port":port,"database":database,"user":user,"password":pass});

const candidateExtentions = ["tiff","tif","jpg","jpeg","png","gif","pdf","txt","csv"];

const pdf = require('pdf-to-png-converter');
const { reject } = require('lodash');
const FILERECORD = require('./FileRecord')




function main(){
    const myArgs = process.argv.slice(2);
    let task = myArgs[0] || "downloader";
    let taskfile = task + ".json";

    let thisRecord = 'EOF';
    if(myArgs.length > 1) {
        let a = myArgs[1].trim();

        thisRecord = new FILERECORD.FileRecord()
        thisRecord.url = a;
    }
    else
    {
        thisRecord = await gnt();        
    }

    while ( thisRecord != 'EOF' )
    {
        go(thisRecord);
    }
} 

async function gnt() {
    await execute("call pp_search.nextfile").then((db_record)=> {
        let new_record = new FILERECORD.FileRecord(db_record);
        if(new_record == 'EOF')
            reject('EOF');
        else
            resolve(new_record);
        })
}

async function go(thisRecord){
    thisRecord.report()
    processRecord(thisRecord).then(
        () => {
            thisRecord.report();
            gnt();

        },
        (reason) => {
            thisRecord.report();
            console.log("reason");
            gnt();
        }
    )
}

async function processRecord(fileRecord) {
    return new Promise(async (resolve, reject) => {

        //debug?console.log("processRecord(" + record.name + ")"):false;
        let goodsize = isTargetSize(fileRecord.size);
        let goodext = candidateExtentions.includes(ext)
        
        if(goodsize & goodext){
            
            FS.writeFileSync(taskfile,JSON.stringify(fileRecord))
            
            let ext = SHARED.getFileExtention(fileRecord.fileName);
            switch(ext) {
                case "pdf":
                        
                    //console.log(record);
                    let totalFaces = await fileRecord.numFaces()
                    if(totalFaces > 0){
                        saveImagesToDisc(record);
                        saveRecordToDisc(record);
                        resolve(record);
                    } else {
                        reject("No faces found.")
                    }
                    break;
                case "sql":
                case "csv":
                case "txt":
                    // console.log(record.size);
                    // download(record)
                    //     .then(() => { processTxt(record.link) } )
                    //     .then(() => { resolve(record) } )
                    // break;
                case "xls":
                case "xlsx":
                    // console.log(record.size);
                    // download(record).then(processXls(record))
                    // .then(resolve(record))
                    // break;
                default:
                    //console.log('got all the way down here.');
                    reject("Unimplemented Filetype.");
            }

        } else {
            console.log('***   ->!<-   ***');
            reject('Wrong size or type.');
        }

    }).then((fileRecord)=>{
        fileRecord.report();
    },
    (reason) => {
        console.log(`Rejected for ${reason}`);
    })
}

(async () => {

    const myArgs = process.argv.slice(2);
    let task = myArgs[0] || "downloader";
    let taskfile = task + ".json";

    let thisRecord = 'EOF';
    if(myArgs.length > 1) {
        let a = myArgs[1].trim();

        thisRecord = new FILERECORD.FileRecord()
        thisRecord.url = a;
    }
    else
    {
        thisRecord = await gnt();        
    }

    while ( thisRecord != 'EOF' )
    {
        go(thisRecord);
    }

    async function gnt() {
        await execute("call pp_search.nextfile").then((db_record)=> {
            let new_record = new FILERECORD.FileRecord(db_record);
            if(new_record == 'EOF')
                reject('EOF');
            else
                resolve(new_record);
            })
    }

    async function go(thisRecord){
        thisRecord.report()
        processRecord(thisRecord).then(
            () => {
                thisRecord.report();
                gnt();

            },
            (reason) => {
                thisRecord.report();
                console.log("reason");
                gnt();
            }
        )
    }

    const processRecord = async function(fileRecord) {
        return new Promise(async (resolve, reject) => {
    
            //debug?console.log("processRecord(" + record.name + ")"):false;
            let goodsize = isTargetSize(fileRecord.size);
            let goodext = candidateExtentions.includes(ext)
            
            if(goodsize & goodext){
                
                FS.writeFileSync(taskfile,JSON.stringify(fileRecord))
                
                let ext = SHARED.getFileExtention(fileRecord.fileName);
                switch(ext) {
                    case "pdf":
                            
                        //console.log(record);
                        let totalFaces = await fileRecord.numFaces()
                        if(totalFaces > 0){
                            saveImagesToDisc(record);
                            saveRecordToDisc(record);
                            resolve(record);
                        } else {
                            reject("No faces found.")
                        }
                        break;
                    case "sql":
                    case "csv":
                    case "txt":
                        // console.log(record.size);
                        // download(record)
                        //     .then(() => { processTxt(record.link) } )
                        //     .then(() => { resolve(record) } )
                        // break;
                    case "xls":
                    case "xlsx":
                        // console.log(record.size);
                        // download(record).then(processXls(record))
                        // .then(resolve(record))
                        // break;
                    default:
                        //console.log('got all the way down here.');
                        reject("Unimplemented Filetype.");
                }
    
            } else {
                console.log('***   ->!<-   ***');
                reject('Wrong size or type.');
            }
    
        }).then((fileRecord)=>{
            fileRecord.report();
        },
        (reason) => {
            console.log(`Rejected for ${reason}`);
        })
    }
})()

//tor.TorControlPort.password = '[Tor521]';


//MYSQL.createConnection().
function execute(query) {
    console.log('executing...')
    let r = db.execute(query, function (err,results,fields){
            console.log("in the callback");
            if(!err){
                console.log("results")
                console.log(results)
                return results;
            }
            else
            {
                console.log("Error:")
                console.log(err);
                return err;
            }
        })

        console.log(r);



    // return new Promise((resolve,reject) => {
    //     try{

    //         db.query(query, function (err,results,fields){
    //             if(err) {
    //                 reject(err);
    //             } else {
    //                 let record = results[0][0];
    //                 resolve(record);
    //             }
    //         })
    //     }
    //     catch(reason){
    //         reject(reason);
    //     }
        
    //     // return "rows affected: " + retval.affectedRows;;
    // })
}

(async () => {

    let nextRecord = 'EOF';
    if(myArgs.length > 1) {
        let a = myArgs[1].trim();
        nextRecord.file = getFileNameFromUrl(a)
        nextRecord.link = a;
    }
    else
    {
        gnt();        
    }

    async function go(nextRecord){
        
        processRecord(nextRecord).then(
            (record) => {
                console.log(record)
                gnt();
            },
            (reason) => {
                console.log(reason);
                gnt();
            }
        )
    }

    function receivedResult(result) {
            
        if(result instanceof Error){
            console.log("db error.")
            //console.log(result);
            process.exit();
        }

        nextRecord = result[0][0];
        //console.log(nextRecord);
        nextRecord = new FILERECORD.FileRecord(nextRecord)
        go(nextRecord)
    }

    function gnt() {
        //console.log('in gnt().'
        db.execute("call pp_search.nextfile", (err,results,fields) => {
            if(!err){
                receivedResult(results);
            }
            else
            {
                receivedResult(err);
                //process.exit();
            }
        })
    }

})();



// const processRecord = async function(record) {
//     return new Promise(async (resolve, reject) => {

//         //debug?console.log("processRecord(" + record.name + ")"):false;

//         let filename =  SHARED.getFileNameFromUrl(record.link);
//         let ext = SHARED.getFileExtention(filename);
//         let goodsize = isTargetSize(record.size);
//         let goodext = candidateExtentions.includes(ext)
//         link = record.link;
        
//         if(goodsize & goodext){
//             record.uuid = uuidv4().toString();
//             FS.writeFileSync(taskfile,JSON.stringify(record))
            
//             debug?console.log("Processing " + record.name + " (" + record.size + ")\n" + record.link ):false;

//             switch(ext) {
//                 case "pdf":
//                         try {
//                             await download(record).then(()=>{},
//                             async (reason) => {processRecord(record)});
//                             await PROCESSOR.processPdf(record);
//                         }
//                         catch(e) {
//                             console.log('***   ->!<-   ***');
//                             reject(e);
//                         }
//                         //console.log(record);
//                         let totalFaces = 0;
//                         if(record.images == undefined){
//                             reject('No Images Found.')
//                         }else{
//                             let imagecount = record.images.length;
//                             for(let i = 0; i< imagecount ; i++) {
//                                 console.log(record.images);
//                                 totalFaces += record.images[i].faces.length;
//                             }
//                             if(totalFaces > 0){
//                                 saveImagesToDisc(record);
//                                 saveRecordToDisc(record);
//                             }
//                             resolve(record);
//                         }
                        
//                     break;
//                 case "sql":
//                 case "csv":
//                 case "txt":
//                     // console.log(record.size);
//                     // download(record)
//                     //     .then(() => { processTxt(record.link) } )
//                     //     .then(() => { resolve(record) } )
//                     // break;
//                 case "xls":
//                 case "xlsx":
//                     // console.log(record.size);
//                     // download(record).then(processXls(record))
//                     // .then(resolve(record))
//                     // break;
//                 default:
//                     //console.log('got all the way down here.');
//                     reject("Unimplemented Filetype.");
//             }

//         } else {
//             console.log('***   ->!<-   ***');
//             reject('Wrong size or type.');
//         }

//     })
// }

// const minSize = 50000
// const maxSize = 11000000
// function isTargetSize(sizeAsString){
//     let s = sizeAsString.toString();
//     s = s.replace("K", " K");
//     s = s.replace("M", " M");
//     s = s.replace("G", " G");
//     s = s.replace("  ", " ");

//     s = s.split(" ");

//     let size = parseFloat(s[0]);
//     let multiplier = 'b';
//     if(s.length>1) multiplier = s[1].toString().toLowerCase();

//     switch(multiplier){
//         case "kib":
//         case "kb":
//         case "k":
//             multiplier = 1000;
//             break;
//         case "mib":
//         case "mb":
//         case "m":
//             multiplier = 100000;
//             break;
//         case "gib":
//         case "gb":
//         case "g":
//             multiplier = 1000000000;
//             break;
//         default:
//             multiplier = 1;
//         break;
//     }
//     size = size * multiplier;
//     if((size < minSize) || (size > maxSize)) {
//         return false;
//     } else {
//         return true;
//     }
    
// }

// function isTargetExtention(filename){
//     let extention = getFileExtention(filename);
//     return candidateExtentions.includes(extention)
// }

// async function download(record){
//     return new Promise(async (resolve,reject) => {
//         let link = record.link.toString();
//         //let link = "http://nxvvamxmbdn3latdplq6azgeeuieaek32h674nl6lzavcod2f2obvxyd.onion/gmi3.com/HR/GMI%20Personnel%20Files/1-ACTIVE%20Employees%20Files%20%28GMI%29/Dillon%2C%20Shannon%20%28Ashleigh%29%20DOH%208-21-17/Dillon%20Driver%20License.pdf";
        
//         let filename = SHARED.getFileNameFromUrl(link)
//         //record.data = null;
//         console.log("downloading...");

//         await MYREQUESTS.makeRequest(link,false,false)
//         .then((data) => { 
//             record.data = new Buffer.from(data);
//             console.log("downloaded: " + record.data.length);
//             //console.log(record);
//             resolve(record)
//             }
//         )
//     })
// }



// [
//     [
//       {
//         id: 80823,
//         name: 'AVANTESRVIN-VASC_20201209133806_1347010.jpeg',
//         size: '80K',
//         date: '11-May-2022',
//         link: 'http://nxvvamxmbdn3latdplq6azgeeuieaek32h674nl6lzavcod2f2obvxyd.onion/gmi3.com/Shared/Depot%20Repair/Customer%20P300/2020/SO0034163-1961/incoming/AVANTESRVIN-VASC/20201209133806/AVANTESRVIN-VASC_20201209133806_1347010.jpeg'
//       }
//     ],
//     ResultSetHeader {
//       fieldCount: 0,
//       affectedRows: 0,
//       insertId: 0,
//       info: '',
//       serverStatus: 34,
//       warningStatus: 0
//     }
//   ]