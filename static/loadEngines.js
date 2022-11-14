console.log('Loading Engines...')

let ddg = document.getElementById("ddgResults");
let google = document.getElementById('googleResults');
let bing = document.getElementById('bingResults');
function query() {
	var params = {},
		pairs = document.URL.split('?')
			.pop()
			.split('&');
	for (var i = 0, p; i < pairs.length; i++) {
		p = pairs[i].split('=');
		params[p[0]] = p[1];
	}
	return params;
}
fetch('/get?type=google&q=' + query().q).then(d => d.text()).then(d => {
	document.getElementById('googleLoading').innerHTML = "";
	google.innerHTML += d;
});
fetch('/get?type=bing&q=' + query().q).then(d => d.text()).then(d => {
	document.getElementById('bingLoading').innerHTML = "";
	bing.innerHTML += d;
});
fetch('/get?type=ddg&q=' + query().q).then(d => d.text()).then(d => {
	document.getElementById('ddgLoading').innerHTML = "";
	ddg.innerHTML += d;
});