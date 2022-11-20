
function getFileExtention(fileName){
    let lastPeriod = fileName.lastIndexOf(".");
    let start = lastPeriod+1;
    let end = fileName.length - start;
    let extention = fileName.substr(start,end)
    return extention.toLowerCase();
}

function getFileNameFromUrl(url){
	url = decodeURI(url);
	let lastSlash = url.lastIndexOf("/");
	let start = lastSlash+1;
	let end = url.length - start;
	let filename = url.substr(start,end)
	return filename.toLowerCase();
}

/** returns 'targetString' with all instances of 'symbol' replaced with 'newsymbol'. */
function replaceAll(targetString,symbol,newsymbol)
{
    targetString = String(targetString).trim();
    while(targetString.indexOf(symbol) > -1)
    {
        targetString = targetString.replace(symbol,newsymbol);
    }

    return targetString;
}

module.exports = {
	getFileExtention: getFileExtention,
	getFileNameFromUrl: getFileNameFromUrl,
	replaceAll: replaceAll
}
