let debug = false;

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const FS = require('fs');
require('c:/users/michael/documents/sourcecode/utils/utils.js');

const MYSQL = require('mysql2');
const SHARED = require('./sharedFunctions')
const FILERECORD = require('./FileRecord');
const _ = require('lodash');


const pdf = require('pdf-to-png-converter');
const { reject } = require('lodash');
const FileRecord = require('./FileRecord');
const MYREQUESTS = require('./myRequests')
const { load } = require('cheerio');
const PDF = require('pdf-to-png-converter')
const { getOuterHTML } = require('domutils');
const PROCESSOR = require('./fileProcessors');


const { program } = require('commander');
if (process.argv.length == 2) {
    process.argv.push("-h")
};
program
    //.option('-p, --path <uri>', '(required for first instance) The URI of the site to index.  (It must display a directory.)')
    .option('-d, --debug', 'Extra debug info')
    .option('-t, --task <taskName>', 'The name of the task (instance) of this process')
    //.option('-n, --name <table_prefix>', 'A friendly name which will determine the names of the tables that hold the index.')
    //.option('-r, --reset', 'Throw away existing data and start over.')
program.parse(process.argv);

const options = program.opts();

if(_.isEqual(options,{})) {
    process.exit();
} else {
    //console.log(options);
}

console.log(options);

if (options.debug) { debug = true } else { debug = false};
if (!options.task) options.task = "miner"; 
//if (!options.name) optionsname = "lastIndexRan";
//if (options.reset) { console.log("this will reset the database one day, but it isn't implemented right now.") }

let task = options.task
let taskfile = task + ".TASK";


let host = "localhost";
let port = 9999;
let database = "pp_search";
let user = "Mike";
let pass = "[Mysql521]";
let db = MYSQL.createConnection({"host":host,"port":port,"database":database,"user":user,"password":pass});

const candidateExtentions = ["tiff","tif","jpg","jpeg","png","gif","pdf","txt","csv"];


(async () => {
    
    if(debug){console.log("Starting...")}

    let task = options.task || "downloader";
    let taskfile = task + ".TASK";
    
    if(FS.existsSync(taskfile)){
        if(debug){console.log("A task file exists, so I'll read it.")}
        let savedRecord = FS.readFileSync(taskfile);
        if(debug){
            console.log("It contained ")
            console.log(savedRecord);
        }
        thisRecord = new FILERECORD.FileRecord(savedRecord);
    }
    else {
        if(debug) { console.log("There is no existing task file, so I'll get the next record from the db.")}
        let nextTask = await getNextTask();

        if(debug) {
            console.log("The database responded with ")
            console.log(nextTask);
        }
        thisRecord = new FILERECORD.FileRecord(nextTask)

        go(thisRecord);
    }

    async function go(thisRecord){
        
        if(thisRecord == undefined) {
            thisRecord = new FILERECORD.FileRecord(await getNextTask())
        }

        thisRecord.report()

        try {
            processRecord(thisRecord).then(
                () => {
                    thisRecord.report();
                    process.exit();
                    go();
    
                },
                (reason) => {
                    thisRecord.report();
                    console.log("reason");
                    process.exit();
                    go();
                }
            )
        }catch(reason) {
            console.log("Rejected for", reason);
        }
        
    }

    // async function processRecord(fileRecord) {
    //     console.log("I'm here...")
    //     return new Promise(async (resolve, reject) => {
    
    //         if(debug) console.log("processRecord(" + record.name + ")")
    //         let goodsize = isTargetSize(fileRecord.size);
    //         let goodext = candidateExtentions.includes(ext)
            
    //         if(goodsize & goodext){
                
    //             if(debug){
    //                 console.log("Writing task file.");
    //                 console.log(fileRecord)
    //             }

    //             FS.writeFileSync(taskfile,JSON.stringify(fileRecord))
                
    //             let ext = SHARED.getFileExtention(fileRecord.fileName);
    //             switch(ext) {
    //                 case "pdf":
                            
    //                     let totalFaces = await fileRecord.numFaces()
    //                     if(totalFaces > 0){
    //                         saveImagesToDisc(record);
    //                         saveRecordToDisc(record);
    //                         resolve(record);
    //                     } else {
    //                         reject("No faces found.")
    //                     }
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
    
    //     }).then((fileRecord)=>{
    //         fileRecord.report();
    //     },
    //     (reason) => {
    //         console.log(`Rejected for ${reason}`);
    //     })
    // }

    async function getNextTask() {

        let result = await execute("call nextfile()");
        return result[0][0];
    }
    
    async function processRecord(fileRecord) {
        return new Promise(async (resolve, reject) => {
    
            //debug?console.log("processRecord(" + fileRecord.name + ")"):false;
            let goodsize = isTargetSize(fileRecord.size);
            let goodext = candidateExtentions.includes(fileRecord.extension);
            
            if(goodsize & goodext){
                //debug?console.log("\tGood size & ext"):false;
                
                //FS.writeFileSync(taskfile,JSON.stringify(fileRecord))
                
                switch(fileRecord.extension) {
                    case "pdf":
                            
                        //console.log(record);
                        let totalFaces = await fileRecord.numFaces();
                        console.log("Success!\t", totalFaces, "found!")
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
            //go();
            process.exit();
        })
    }

    //This needs to be revisited.  The filetype should be considered in the response.
    function isTargetSize(size){
        
        const minSize = 50000;
        const maxSize = 10000000;
        
        if((size < minSize) || (size > maxSize)) return false;
        return true;
    }

    async function execute(query) {
        //debug?console.log('Executing ' + query):0

        return await new Promise((resolve,reject)=>{
            
            db.execute(query, (err,results,fields) => {
                //debug?console.log("I'm in the callback here."):0;
                
                if(!err){
                    resolve(results);
                }
                else
                {
                    console.log("SQL Error:")
                    console.log("Query: " + query)
                    console.log(err);
                    reject(err);
                }
            })
        })
    }

})()


