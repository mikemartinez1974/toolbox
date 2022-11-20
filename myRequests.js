let debugging = true;

const HTTP = require('http');
const HTTPS = require('https');

//const TOR = require('@mich4l/tor-client');
const TOR = require('tor-request');
// const tor = new TOR.TorClient({socksHost:'127.0.0.1', socksPort:9050});

const _ = require('lodash');
const SHARED = require("./sharedFunctions")

const availableTorPorts = [9050,9052,9054,9056,9058];
let portIndex = 0;
function getNextTorPort() {
    if(portIndex == availableTorPorts.length) portIndex = 0;
    return availableTorPorts[portIndex++];
}

const { program } = require('commander');
if (process.argv.length == 2) {
    process.argv.push("-h")
};

let programIsSelf = false;
if(process.argv[1].toLowerCase().endsWith("myrequests.js")) programIsSelf = true;
if(process.argv[1].toLowerCase().endsWith("myrequests")) programIsSelf = true;

if(programIsSelf) {

    program
        //.option('-p, --path <uri>', '(required for first instance) The URI of the site to index.  (It must display a directory.)')
        .option('-d, --debug', 'Extra debug info')
        .option('-?, --test true', 'Runs a test to make sure the various requests are functioning.')
        //.option('-r, --reset', 'Throw away existing data and start over.')
    program.parse(process.argv);

    const options = program.opts();

    if(_.isEqual(options,{})) {
        process.exit();
    } else {
        console.log(options);
    }

    if (options.debug) {debugging = true} else {debugging = false;}
    if (options.test) {test()}

}

async function getNextProxy(){
    return new Promise((reject,resolve) => {
        resolve("");
    })
}

async function getNextBrowserAgent() {
    return new Promise((reject,resolve) => {
        resolve("");
    })
}

// async function makeRequest(url,proxy,useTor) {
    
//     if (debugging) {
//         console.warn(`makeRequest(${url},${proxy},${useTor})`);
//     }

//     // console.log("makeRequest()");
//     // console.log(url);


//     let urlIsOnion = useTor || (url.indexOf(".onion/") > -1) ? true : false
//     let urlIsHttps = url.indexOf("https://") > -1 ? true : false
//     let urlIsHttp = url.indexOf("http://") > -1 ? true : false

//     let options = {
//         url : url,
//         ContentType: "text/html",
//         charset: 'utf-8'
//     };

//     if(urlIsOnion) {

//         options = {
//             url: url,
//             strictSSL: true,
//             agentClass: require('socks5-https-client/lib/Agent'),
//             agentOptions: {
//               socksHost: 'localhost', // Defaults to 'localhost'.
//               socksPort: getNextTorPort(), // Defaults to 1080.
//               // Optional credentials
//               //socksUsername: 'proxyuser',
//               //socksPassword: 'p@ssw0rd',
//             }
//         }

//         if(urlIsHttps) {
//             options.agentClass = require('socks5-https-client/lib/Agent');
//             return new Promise((resolve,reject)=> {
//                 makeHttpsTorRequest(options)
//                 .then(
//                     (result) => {resolve(result)},
//                     (reason) => {reject(reason)}
//                 )}
//             )

//         }else if(urlIsHttp) {
//             return new Promise((resolve,reject)=> {
//                 //console.log("making tor http request for " + getFileNameFromUrl(url) );
//                 makeHttpTorRequest(options)
//                 .then(
//                     (result) => {
//                         resolve(result)
//                     },
//                     (reason) => {reject(reason)}
//                 )}
//             )
//         }

//     } else { 

//         if(proxy) {
//             let p = proxy.split(":");
//             //let agent = await getNextBrowserAgent();
    
//             if(p.length > 2)
//             {
//                 options.headers = {
//                     host : url.split("/")[2]
//                 };
//                 options.host = p[0];
//                 options.port = parseInt(p[1]);
//                 options.username = p[2];
//                 options.password = p[3]; 
//             }
//             else {
//                 options.host = p[0];
//                 options.port = parseInt(p[1]);
//             }
//         }

//         if(urlIsHttps) {
//             return new Promise((resolve,reject)=> {
//                 makeHttpsRequest(options)
//                 .then(
//                     (result) => {resolve(result)},
//                     (reason) => {reject(reason)}
//             )})
//         } else if (urlIsHttp) {
//             return new Promise((resolve,reject) => {
//                 makeHttpRequest(options)
//                 .then(
//                     (result) => {resolve(result)},
//                     (reason) => {reject(reason)}
//             )})
//         }
//     }
// }

async function makeHttpsTorRequest(options) {
    //console.log(options);
    return new Promise((resolve,reject) => {
        request = TOR.request(options,(error,response)  => {
            if(error) {
                makeHttpsTorRequest(options);
            }
            if(!response.body) {
                reject("no content in file");
            }
            else
            {
                resolve(response.body);
            }
        });
    })
};

async function makeHttpTorRequest(options) {
    //console.log(options);
    return new Promise((resolve,reject) => {
        console.log("Downloading...")
        request = TOR.request(options,(error,response)  => {
            try{
                if(error) {
                    reject(error);
                }

                if(Object(response).hasOwnProperty('body')) {
                    resolve(response.body);
                }
                else {
                    console.log(response)
                }
            }
            catch(e) {
                console.log(e);
                reject(e.message)
            }
        });
    })
};

async function makeHttpsRequest(options) {
    if(debugging) {
        console.log(`makeHttpsRequest(${options})`);
        console.log(options);
    }

    let keycount = Object.keys(options).length;
    if(keycount == 1) options = options.url;

    return new Promise((resolve,reject) => {
        
        request = HTTPS.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data = data + chunk.toString();
            });

            response.on('end', () => {
                resolve(data)
            });

            response.on('error', (error) => {
                console.error('\t -- HTTPS RESPONSE ERROR --');
                //console.error('\t - RESPONSE ERROR:',error,options);
                reject(error);
            });
        });

        request.on('error', (error) => {

            console.log("\t - HTTPS REQUEST Error: -- Connection Reset --");
            reject(error)
        });

        request.end() 
    })
};

async function makeHttpRequest(options) {
    
    // console.log(options.length)
    // console.log(options)
    // if(options.length == 1) options = options.url;

    if(debugging) {
        console.log(`makeHttpRequest()`);
        console.log(options);
    } 

    let keycount = Object.keys(options).length;
    if(keycount == 1) options = options.url;
        
    return new Promise((resolve,reject) => {   
              
        request = HTTP.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data = data + chunk.toString();
            });

            response.on('end', () => {
                resolve(data)
            });

            response.on('error', (error) => {
                console.error('\t -- RESPONSE ERROR --');
                //console.error('\t - RESPONSE ERROR:',error,options);
                reject(error);
            });
        });

        request.on('error', (error) => {
            console.log("\t - HTTP Error: -- Connection Reset --");
            reject(error)
        });

        request.end() 
    })
};

async function download(url){
    return new Promise((resolve,reject) => {

        console.log("downloading " + url.toString());
        let data = null;
        
        while(data == null){
        
            data = makeRequest(url)
            .then((data) => {
                if(debugging){
                    console.log("[data]");
                    console.log(data);
                    console.log("[/data]")
                } 
                resolve(data) 
            })

            .catch((reason) => {
                let message = "\t Error - " + reason + ". Retrying...";
                console.log(message);
            })
        }
    })
}

async function makeRequest (url,proxy,useTor) {
    
    console.log("Downloading ", url)

    url = String(url);
    let urlIsOnion = useTor || (url.indexOf(".onion/") > -1) ? true : false
    let urlIsHttps = url.indexOf("https://") > -1 ? true : false
    let urlIsHttp = url.indexOf("http://") > -1 ? true : false

    if (debugging) {
        //console.warn(`makeRequest(${url},${proxy},${useTor})`);
        console.log("Onion: ", urlIsOnion)
        console.log("Https: ", urlIsHttps)
        console.log("Http:  ", urlIsHttp)
    }
    
    let options = {
        url : url //,
        //ContentType: "text/html",
        //charset: 'utf-8'
    };

    if(urlIsOnion) {

        options = {
            url: url,
            strictSSL: true,
            agentClass: require('socks5-https-client/lib/Agent'),
            agentOptions: {
              socksHost: 'localhost', // Defaults to 'localhost'.
              socksPort: getNextTorPort(), // Defaults to 1080.
              // Optional credentials
              //socksUsername: 'proxyuser',
              //socksPassword: 'p@ssw0rd',
            }
        }

        if(urlIsHttps) {
            options.agentClass = require('socks5-https-client/lib/Agent');
            return new Promise((resolve,reject)=> {
                makeHttpsTorRequest(options)
                .then(
                    (result) => { console.log("Download complete."); resolve(result)},
                    (reason) => {reject(reason)}
                )}
            )

        }else if(urlIsHttp) {
            return new Promise((resolve,reject)=> {
                //console.log("making tor http request for " + getFileNameFromUrl(url) );
                makeHttpTorRequest(options)
                .then(
                    (result) => { console.log("Download complete."); resolve(result)},
                    (reason) => {reject(reason)}
                )}
            )
        }

    } else { 

        if(proxy) {
            let p = proxy.split(":");
            //let agent = await getNextBrowserAgent();
    
            if(p.length > 2)
            {
                options.headers = {
                    host : url.split("/")[2]
                };
                options.host = p[0];
                options.port = parseInt(p[1]);
                options.username = p[2];
                options.password = p[3]; 
            }
            else {
                options.host = p[0];
                options.port = parseInt(p[1]);
            }
        }

        if(urlIsHttps) {
            return new Promise((resolve,reject)=> {
                makeHttpsRequest(options)
                .then(
                    (result) => { console.log("Download complete."); resolve(result)},
                    (reason) => {reject(reason)}
            )})
        } else if (urlIsHttp) {
            return new Promise((resolve,reject) => {
                makeHttpRequest(options)
                .then(
                    (result) => { console.log("Download complete."); resolve(result)},
                    (reason) => {reject(reason)}
            )})
        }
    }
}



module.exports = {
    makeRequest: makeRequest,
    download: download
}


// these are the tests.
async function test() {
    try{

        makeRequest("http://yahoo.com",false,false).then(
            (result) => {console.log('HTTP Passed.')},
            (reason) => {console.log('HTTP Failed - ' + reason)}
        )
    
        makeRequest("https://google.com").then(
            (result) => {console.log('HTTPS Passed.')},
            (reason) => {console.log('HTTPS Failed - ' + reason)}
        )
    
        makeRequest("http://rgleaktxuey67yrgspmhvtnrqtgogur35lwdrup4d3igtbm3pupc4lyd.onion/",false,false).then(
            (result) => {console.log('Tor HTTP Passed.')},
            (reason) => {console.log('Tor HTTP Failed - ' + reason)}
        )
    
        makeRequest("https://check.torproject.org/",false,true).then(
            (result) => {console.log('Tor HTTPS Passed.')},
            (reason) => {console.log('Tor HTTPS Failed - ' + reason)}
        )
    } catch(e) {
        console.log(e);
    }
}