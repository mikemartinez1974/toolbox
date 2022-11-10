
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

module.exports = {
	getFileExtention: getFileExtention,
	getFileNameFromUrl: getFileNameFromUrl
}
