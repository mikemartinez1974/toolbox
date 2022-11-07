
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;


const PDF = require('pdf-to-png-converter')
const FS = require('fs');
const MYSQL = require('mysql2');
const { getOuterHTML } = require('domutils');
eval(FS.readFileSync('c:/users/michael/documents/sourcecode/utils/utils.js')+'');
//eval(FS.readFileSync('c:/users/michael/documents/sourcecode/data/DataTools.js')+'');
eval(FS.readFileSync('sharedFunctions.js')+'');
eval(FS.readFileSync('fileProcessors.js')+'');

let host = "localhost";
let port = 9999;
let database = "pp_search";
let user = "Mike";
let pass = "[Mysql521]";
let db = MYSQL.createConnection({"host":host,"port":port,"database":database,"user":user,"password":pass});



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
let taskfile = task + ".json";


const minSize = 50000;
const maxSize = 10000000;

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

    async function go(nextrecord){
        console.log('\n====================0======================')
        //console.log(getFileNameFromUrl(nextRecord.link));
        processRecord(nextRecord).then(
            (result) => {
                console.log("Success.")
                gnt();

            },
            (reason) => {
                console.log("Failure.")
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

    // while (nextRecord != "EOF"){
        
    //     try {
            
    //         if(FS.existsSync(taskfile)) FS.unlinkSync(taskfile); 
                
    //         console.log("The next one.")  
    //         let record = {}; 
    //         try {
    //             record = await getNextTask()
    //         }
    //         catch(reason){
    //             reject(reason);
    //         }

    //         console.log(record);

    //         await processRecord(nextRecord)
    //         }catch(reason) {
            
    //     }
        
    // }

})();

// async function gnt() {
//     let r;
//     await execute("call pp_search.nextfile").then((record)=> {
//         console.log("in here");
//         console.log(record)
//         r = record;
//         return (record);
//     })
// }


async function getNextTask(){

    return new Promise(async(reject,resolve) => {
        let record = null;
        
        if(FS.existsSync(taskfile)){
            record = JSON.parse(FS.readFileSync(taskfile)).link;
        } else {
            try{
                //Execute statement returns a record.
                let r = execute("call pp_search.nextfile");
                console.log("nextrecord...")
                console.log(r)
                resolve(record);
            }
            catch(reason)
            {
                
                reject(reason);
            }
        }       
    })
}






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