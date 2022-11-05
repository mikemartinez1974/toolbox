
const LINEREADER = require('linereader');

const ssnRX = RegExp("^(?!666|000|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0{4})\\d{4}$","ig");
const ssnHeaderRX = RegExp("\\b(ssn|ss|social security|soc([\\s\\.-]{1,2})sec)\\b","ig");

async function processText(filename) {
    return new Promise((resolve,reject) => {

        let result = {};
        result.ssn = 0;
        result.ssnHeader = 0;
        
        const LineReader = new LINEREADER(filename);
        LineReader.on('error', function (err) {
            reject(err);
            LineReader.close();
        });
          
        LineReader.on('line', function (lineno, line) {
            LineReader.pause();
            
            //Do something here.
            let ssnFound = line.match(ssnRX).length;
            result.ssn += ssnFound;

            //Do more stuff here.
            let ssnHeaderFound = line.match(ssnHeaderRX).length;
            result.ssnHeader += ssnHeaderFound;

            LineReader.resume();
        });
          
        LineReader.on('end', function () {
            resolve(result);
        });

    })
    
}

async function processXls(filename){

}