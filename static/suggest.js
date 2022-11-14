let lastQ="";
function suggest(){
	let query=document.getElementById("q").value;
	if(query===lastQ||query===""){
		return;
	}
	lastQ=query;
	fetch("https://kestrogle.tk/suggestions?q="+query).then(d=>d.text()).then(d=>{
		let res=JSON.parse(d);
		console.log(res);
	});
}
setInterval(suggest(),1000);