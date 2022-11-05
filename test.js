
const debugging = true;
makeRequest("http://google.com").then(
    (result) => {console.log(result)},
    (reason) => {console.log(reason)}
)

async function makeRequest(url) {
    if (debugging) {
        console.warn(`makeRequest(${url}`);
    }

    return new Promise((resolve,reject)=>{
        makeHttpRequest(url)
        .then(
            (result) => {resolve(result)},
            (reason) => {reject(reason)}
        )}
    )
    .catch((error) => { console.log(error)});
}

async function makeHttpRequest(options) {
    let http = require('http');
    if(debugging) {
        console.log(`makeHttpRequest(${options})`);
        console.log(options);
    } 
    
    return new Promise((resolve,reject) => {         
        request = http.request(options, (response) => {
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