const MYSQL = require('mysql2');
let host = "localhost";
let port = 9999;
let database = "pp_search";
let user = "Mike";
let pass = "[Mysql521]";
let db = MYSQL.createConnection({"host":host,"port":port,"database":database,"user":user,"password":pass});



gnt();
function gnt() {
    //console.log('in gnt().')
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
    //return nextrecord
}

function receivedResult(result) {
    
    if(result instanceof Error){
        console.log("db error.")
        console.log(result);
        process.exit();
    }

    console.log(result);
    process.exit()
}