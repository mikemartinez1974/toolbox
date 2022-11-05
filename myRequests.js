const debugging = false;

const availableTorPorts = [9050,9052,9054,9056,9058];
let portIndex = 0;
function getNextTorPort() {
    if(portIndex == availableTorPorts.length) portIndex = 0;
    return availableTorPorts[portIndex++];
}

test();

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

/** Executes a search and sends the html to onRequestComplete() */
async function makeRequest(url,useProxy,useTor) {
    if (debugging) {
        console.warn(`makeRequest(${url},${useProxy},${useTor})`);
    }

    let urlIsOnion = useTor || (url.indexOf(".onion/") > -1) ? true : false
    let urlIsHttps = url.indexOf("https://") > -1 ? true : false
    let urlIsHttp = url.indexOf("http://") > -1 ? true : false

    let options = {
        url : url
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
                    (result) => {resolve(result)},
                    (reason) => {reject(reason)}
                )}
            )

        }else if(urlIsHttp) {
            return new Promise((resolve,reject)=> {
                makeHttpTorRequest(options)
                .then(
                    (result) => {resolve(result)},
                    (reason) => {reject(reason)}
                )}
            )
        }

    } else { 

        if(useProxy) {
            let proxy = getNextProxy().split(":");
            let agent = await getNextBrowserAgent();
    
            if(proxy.length > 2)
            {
                options.headers = {
                    host : url.split("/")[2],
                    agent : agent
                };
                options.host = proxy[0];
                options.port = parseInt(proxy[1]);
                options.username = proxy[2];
                options.password = proxy[3]; 
            }
            else {
                options.host = proxy[0];
                options.port = parseInt(proxy[1]);
            }
        }

        if(urlIsHttps) {
            return new Promise((resolve,reject)=> {
                makeHttpsRequest(options)
                .then(
                    (result) => {resolve(result)},
                    (reason) => {reject(reason)}
            )})
        } else if (urlIsHttp) {
            return new Promise((resolve,reject) => {
                makeHttpRequest(options)
                .then(
                    (result) => {resolve(result)},
                    (reason) => {reject(reason)}
            )})
        }
    }
}

async function makeHttpsTorRequest(options) {
    let tor = require('tor-request');
    //console.log(options);
    return new Promise((resolve,reject) => {
        request = tor.request(options,(error,response)  => {
            if(error) {
                reject(error);
            }
            resolve(response.body);
        });
    })
};

async function makeHttpTorRequest(options) {
    let tor = require('tor-request');
    //console.log(options);
    return new Promise((resolve,reject) => {
        request = tor.request(options,(error,response)  => {
            if(error) {
                reject(error);
            }
            resolve(response.body);
        });
    })
}

async function makeHttpsRequest(options) {
    if(debugging) {
        console.log(`makeHttpRequest(${options})`);
        console.log(options);
    }

    return new Promise((resolve,reject) => {
        request = require('https').request(options.url, (response) => {
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
}

async function makeHttpRequest(options) {
    let http = require('http');
    if(debugging) {
        console.log(`makeHttpRequest(${options})`);
        console.log(options);
    } 
    
    return new Promise((resolve,reject) => {         
        request = http.request(options.url, (response) => {
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
}
