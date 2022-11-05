
//import dependencies.
const _ = require('lodash');
const { program } = require('commander');
const fs = require('fs');
const cheerio = require('cheerio');

//import my util code.
eval(fs.readFileSync('myRequests.js') + '');
eval(fs.readFileSync('c:/users/michael/documents/sourcecode/utils/utils.js')+'');
eval(fs.readFileSync('c:/users/michael/documents/sourcecode/data/DataTools.js')+'');

//set up TOR
const tor = require('tor-request'); 
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
tor.TorControlPort.password = '[Tor521]';

// tor.request('https://api.ipify.org', function (err, res, body) {
//   if (!err && res.statusCode == 200) {
//     console.log("Your public (through Tor) IP is: " + body);
//   }
// });

// tor.request(site,(err,res,body) => {
//     if(!err && res.statusCode == 200) {
//         console.log(body);
//     }
//     else {
//         console.error(err);
//     }
// });


// let entry = {
//     name: name.trim(),
//     size: size.trim(),
//     date: fdate.trim(),
//     link: link.trim()
// }

if (process.argv.length == 2) {
    process.argv.push("-h")
};

program
    .option('-p, --path <uri>', '(required for first instance) The URI of the site to index.  (It must display a directory.)')
    .option('-d, --debug', 'Extra debug info')
    .option('-t, --task <taskName>', 'The name of the task (instance) of this process')
    .option('-n, --name <table_prefix>', 'A friendly name which will determine the names of the tables that hold the index.')
    .option('-r, --reset', 'Throw away existing data and start over.')
program.parse(process.argv);

const options = program.opts();

if(_.isEqual(options,{})) {
    process.exit();
} else {
    console.log(options);
}

if (options.debug) console.log(options);
if (!options.task) options.task = "indexer"; 
if (!options.name) optionsname = "lastIndexRan";
if (options.reset) {
    console.log("this will reset the database one day, but it isn't implemented rigt now.")
}

let task = options.task
let taskfile = task + ".TASK";

(async () => {

    let nextSite = "EOF"
    if(options.path) {
        nextSite = String(options.path).trim();
    }
    else
    {
        nextSite = await getNextTask();
    }
    
    while (nextSite != "EOF"){
    
        let url = nextSite;
        try{
            let page = await torRequest(url,false);
            let results = parseDirectory(page,url);
            let files = results.files;
            let directories = results.directories;

            try{
                console.log("\t" + files.length + " files & " + directories.length + " dirs in ..." + url.substr(url.length -50, 50));
            }
            catch(e){
                console.log("\t" + files.length + " files & " + directories.length + " dirs in ..." + url.substr(url.length -15, 15));
            }
            
            //if(files.length>0) writeFileList(files);
            if(files.length>0) await writeData(files,options.name + "_files");
            if(directories.length > 0) await writeData(directories,options.name + "_directories");
            if(fs.existsSync(taskfile)) fs.unlinkSync(taskfile);
            nextSite = await getNextTask();
    
        } catch (e) {
            console.log(e);
            //process.exit();
            //console.log(nextSite);
            console.log("retrying...");
            continue
        }
    }

    console.log("Finished.");
    process.exit();

    async function getNextTask(){
        
        let link = "";
        if(fs.existsSync(taskfile)){
            link = fs.readFileSync(taskfile).toString().trim();
            fs.unlinkSync(taskfile);
        } else {
            let record = await execute("select `id`,`link` from `Indexer`.`" + options.name + "_directories` order by id asc limit 1;");
            if(record.length > 0) {
                let id = record[0].id;
                await execute("delete from `Indexer`.`" + options.name + "_directories` where `id` = " + id + ";")
                link = record[0].link;
                fs.writeFileSync(taskfile,link);
            }
            else if(record.length == 0) return "EOF";
        }
        return link;
    }
    
    async function torRequest(path,refreshIp){
        let rip = refreshIp || false;
        tor.setTorAddress('localhost',getNextTorPort());
        return new Promise((resolve,reject) => {
            
            if(rip) {
                tor.newTorSession((err)=>{
                    if(err != null){
                        //reject(err);
                    }
                });
            }

            tor.request(path,(err,res,body) => {
                if(!err && res.statusCode == 200){
                    resolve(body);
                }
                else {
                    //console.log(err);
                    reject(err);
                }
            });
        });
    }
    
    function parseDirectory(htmltext,path) {
        let directories = [];
        let filelist = [];
        const $ = cheerio.load(htmltext);
    
        listing = $("tbody tr");
        //console.log(listing);

        if((directories.length == 0) && (filelist.length == 0)) {
            let rows = listing;
            for (let r = 0; r<rows.length; r++){
                let cells = $(rows[r]).find("td");
                if(cells.length == 5){

                    let name = $(cells[1]).text().trim();
                    if (name == "Parent Directory") continue;
                    let size = $(cells[3]).text().trim();
                    if(size == "-") size = "<dir>";
                    let fdate = $(cells[2]).text().trim();
                    let link = $(cells[1]).find("a").attr("href");
                    link = path + link

                    let entry = {
                        name: name.trim(),
                        size: size.trim(),
                        date: fdate.trim(),
                        link: link.trim()
                    }

                    //console.log(entry);

                    if(size == "<dir>") {
                        directories.push(entry);
                    }
                    else {
                        filelist.push(entry);
                    }
                }
                else continue;
            }
        } 

        if((directories.length == 0) && (filelist.length == 0)) {
            
            for(let i = 0; i < listing.length; i++){
                let item = listing[i];
                let cells = $(item).find("td");
        
                let cell1 = $(cells[0]);
                
                let name = cell1.text();
                if((name == undefined) || (name == "")) continue;
                let link = cell1.find("a").attr('href');
                if(link == "../") continue;
                link = path + link;
                
                let cell2 = $(cells[1]);
                let size = cell2.text();
                
                let cell3 = $(cells[2]);
                let fdate = cell3.text();
                
        
                if(size == "-") {
                    size = "<dir>";
                }
        
                let entry = {
                    name: name.trim(),
                    size: size.trim(),
                    date: fdate.trim(),
                    link: link.trim()
                }
        

                if(size == "<dir>") {
                    directories.push(entry);
                }
                else {
                    filelist.push(entry);
                }
            }
        } 

        if((directories.length == 0) && (filelist.length == 0)) {
            let lines = [];
            lines = htmltext.split("\n");
            for(let i = 0; i < lines.length; i++){
                //console.log(lines[i].toString().match(/^\<a href=/));
                if(lines[i].toString().match(/^\<a href=/) == null) continue;
                thisline = cheerio.load(lines[i]);
                let anchor = thisline("a");
                let name = anchor.text();
                let link = anchor.attr("href")
                link = path + link;
                let clippedline = thisline.text().replace(name,"").trim();
                clippedline = replaceAll(clippedline,"  ", " ");
                let parts = clippedline.split(" ");
                let fdate = parts[0];
                let size = parts[2];
                if(size == "-") size = "<dir>";
                // if((name == undefined) || (name == "")) continue;
                let entry = {
                    name: name.trim(),
                    size: size.trim(),
                    date: fdate.trim(),
                    link: link.trim()
                }
                if(size == "<dir>") {
                    directories.push(entry);
                }
                else {
                    filelist.push(entry);
                }
            }
        }
    
        let results = {"directories":directories, "files":filelist};
        //console.log(results);
        return results;
    
    }

    async function writeData(recordsToWrite,table) {
        if(!table) table == "output"
        //console.log(leadsToWrite);

        if(recordsToWrite.length > 0)
        {
            //We're writing to a database. If the table doesn't exist, create it first.
            let sql = "CREATE TABLE IF NOT EXISTS `indexer`.`" + table + "` (    `id` INT NOT NULL AUTO_INCREMENT, ";
            
            for(field of Object.keys(recordsToWrite[0])) {
                sql += "`" + field + "` TEXT, ";
            }
   
            sql += " PRIMARY KEY (`id`), UNIQUE KEY `id_UNIQUE` (`id` ASC) VISIBLE);"
            //sql += `)`
   
            sql = sql.replace( ',)' , ')' )

            let result = await execute(sql);

            //console.log("records: " + recordsToWrite.length)
            for(let i = 0; i < recordsToWrite.length; i++)
            {
                //console.log(leadsToWrite[i]);

                let record = recordsToWrite[i];
                let insertQuery = "insert into `indexer`.`" + table + "` ( ";
                for(let field of Object.keys(record)) {
                    insertQuery += "`" + field + "`, ";
                }
                insertQuery += `) `;
                insertQuery = replaceAll( insertQuery , ", )" , " ) " );
                insertQuery += ` values (`;
                for(let value of Object.values(record)) {
                    insertQuery += `"${value}", `
                }

                insertQuery += `) `
                insertQuery = replaceAll(insertQuery, ", )" , " ) ");
                //console.log(insertQuery);
                let result = await insert(insertQuery);
                //console.log(result);
            }

            //console.log("\r\n   √ " + currentTime() + " " + recordsToWrite.length + ` records written to [scraperdata].[${table}] (from page ${pagenum})` );
        } 
        else
        {
            //console.log("\r\n   * " + currentTime() + " No Matching Data" +` (from page ${pagenum})` );
        }
    }

})();

const availableTorPorts = [9050,9052,9054,9056,9058];
let portIndex = 0;
function getNextTorPort() {
    if(portIndex == availableTorPorts.length) portIndex = 0;
    return availableTorPorts[portIndex++];
}

//1 files & 13 dirs in ...47va47ewbwad.onion/JhykowedsgX/0Fq2sdWMXo8gty/isp/
//1 files & 13 dirs in ...47va47ewbwad.onion/JhykowedsgX/0Fq2sdWMXo8gty/isp/