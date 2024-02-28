/**
 By Kestron and Shipment22
*/
const express = require('express');
const { JSDOM } = require('jsdom');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
let site = new express();
site.use(express.static(path.join(__dirname + '/static')));
site.listen(3000, () => {
	console.log("Site running.");
});
function unSafe(lvl, txt) {
	txt = txt.toLowerCase();
	let removeResult = false;
	let blacklist = require("./blacklist.js");
	if (lvl === "Safe") {//Words
		for (var i = 0; i < blacklist.words.length; i++) {
			var checker=new RegExp("\\b"+blacklist.words[i]+"(ing|\\b|er|s|es|ed)","gi");
			if (checker.test(txt)) {
				removeResult = true;
			}
		}
	}
	if (lvl === "Safe" || lvl === "Moderate") {//Sites
		let txtCheck = txt;
		try {
			txtCheck = txt.split("https://")[1].split("/")[0];
		}
		catch (e) {
			try {
				txtCheck = txt.split("http://")[1].split("/")[0];
			}
			catch (e) {
				return removeResult; //If it's not a link, then moderate isn't looking for it.
			}
		}
		for (var i = 0; i < blacklist.sites.length; i++) {
			if (txtCheck.includes(blacklist.sites[i])) {
				removeResult = true;
			}
		}
	}
	return removeResult;
}
async function getResults(engine, query) {
	let results = []

	let engines = {
		google: {
			url: 'https://www.google.com/search?q=',
			resultsSelector: '.N54PNb.BToiNc.cvP2Ce',
            getTitle(resultEls, i) {
                return resultEls[i].getElementsByTagName("h3")[0].textContent;
            },
			getUrl: function(resultEls, i) {
				return resultEls[i].getElementsByTagName("a")[0].href.replace(/&sa=U[a-z0-9&=_-]+/i, '')
			},
			getDescription: function(resultEls, i) {
				return resultEls[i].querySelector("div.VwiC3b.yXK7lf.lVm3ye.r025kc.hJNv6b.Hdw6tb").innerHTML.replace(/�/g, '<span class="seperator">∙</span>')
			}
		},
		bing: {
			url: 'https://www.bing.com/search?q=',
			resultsSelector: '.b_algo',
			titleSelector: 'a',
			urlSelector: 'a',
			getDescription: function(resultEls, i) {
				try {
                    try { resultEls[i].getElementsByClassName("algoSlug_icon")[0].remove();} catch (e) {}
					return "" + resultEls[i].getElementsByClassName("b_caption")[0].innerHTML.trim();
				}
				catch (e) {
                    console.error("Caught: ", e);
					return "No description provided";
				}
			}
		},
		ddg: {
			url: 'https://lite.duckduckgo.com/lite/?q=',
			resultsSelector: 'td .result-link:first-child',
			getTitle: function(resultEls, i) {
                if (resultEls[i].parentElement.parentElement.classList.contains("result-sponsored")) {
                    console.log("Sponsored DDG result, returning 'bad result' and moving on");
                    return "bad result";
                }
				return resultEls[i].textContent
			},
			getUrl: function(resultEls, i) {
				return decodeURI(resultEls[i].href.slice(25, -69))
			},
			getDescription: function(resultEls, i, DOM) {
                try {
				    //return DOM.window.document.querySelectorAll('.result-snippet')[i].innerHTML;
                    return resultEls[i].parentElement.parentElement.nextElementSibling.getElementsByClassName("result-snippet")[0].innerHTML.trim();
                } catch (e) {
                    console.error("Caught while getting DuckDuckGo descriptions: ", e);
                    return "No description provided";
                }
			}
		}
	}
    
    try {
	await fetch(engines[engine].url + query, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
		}
	}).then(d => d.text()).then(d => {
		let DOM = new JSDOM(d);
		let resultEls = DOM.window.document.querySelectorAll(engines[engine].resultsSelector);
		for (var i = 0; i < resultEls.length; i++) {
			let title = engines[engine].getTitle ? engines[engine].getTitle(resultEls, i) : resultEls[i].querySelectorAll(engines[engine].titleSelector)[1].textContent,
				url = engines[engine].getUrl ? engines[engine].getUrl(resultEls, i) : resultEls[i].querySelector(engines[engine].urlSelector).href,
				description = engines[engine].getDescription ? engines[engine].getDescription(resultEls, i, DOM) : resultEls[i].querySelector(engines[engine].descriptionSelector).innerHTML,
				favi = "";
            // If the result is considered bad by the title, url or description getting function, just move on
            if (title === "bad result" || url === "bad result" || description === "bad result") continue;
			url = decodeURIComponent(url);
			try {
				favi = "https://external-content.duckduckgo.com/ip3/" + url.split('https://')[1].split("/")[0] + ".ico";
			}
			catch (e) {
				try {
					favi = "https://external-content.duckduckgo.com/ip3/" + "http://" + url.split('http://')[1].split("/")[0] + ".ico";
				}
				catch (e) {
					favi = "BarioMagGlass.png";
				}
			}
			let resultNumber = i + 1, engineIndecator = `<span class="engine engine-${engine}" title="Number ${i + 1} on ${engine}"><img src='${engine + '.png'}' width="20px" height="20px" ></span>`
			results.push({ title, url, description, engine, engineIndecator, resultNumber, favi });
		}
	});
    } catch(e) {
        console.log("Caught error getting results from ", engine, ":\n", e);
    }

	return results;
}
site.get('/search', async (req, res) => {
	// Gets the query and if it's empty redirects to /
	let query = req.query.q;
	if (query === undefined || query === null || query.length === 0) {
		res.send("<script>window.top.location.replace('/');</script>");
		return;
	}

	//Gets the safesearch setting, and if it's empty, defaults to the highest level.
	let ssLvl = req.query.safesearch;
	if (ssLvl === undefined || ssLvl === null || ssLvl.length === 0) {
		ssLvl = "Safe";
	}

	try {
		let options = {
			query: query,
			useLoadEngines: req.query.load_engines_js || 'no',
			useSidebar: req.query.sidebar || 'no',
			useCombinedResults: req.query.combine || 'yes'
		}

		if (req.query.load_engines_js != "true" && req.query.load_engines_js != "yes") {
			let engines = [
				'google',
				'bing',
				'ddg'
			]

			if (req.query.combine != "false" && req.query.combine != "no") {
				let results = [];
				for (let i in engines) {
					try {
						let engineResults = await getResults(engines[i], query)
						for (let j in engineResults) {
							try {
								let same = false;

								// console.log(engineResults[j].engine)
								for (let k in results) {
									results[k].matchNum = results[k].matchNum || 0;
									if (results[k].url.replace(/\/$/, '') == engineResults[j].url.replace(/\/$/, '')) {
										if (results[k].resultNum) {
											results[k].resultNum += engineResults[j].resultNumber;
										}
										else {
											results[k].resultNum = engineResults[j].resultNumber;
										}
										// console.log('Yo same bro')
										let engine = engineResults[j].engine;
										results[k].engine += `, ${engine}`;
										results[k].engineIndecator += `<span class="engine engine-${engine}" title="Number ${engineResults[j].resultNumber} on ${engine}"><img src='${engines[i] + '.png'}' width="20px;" height="20px"></span>`;
										results[k].matchNum++;
										same = true;
										break;
									}
									if (unSafe(ssLvl, results[k].title) || unSafe(ssLvl, results[k].url) || unSafe(ssLvl, results[k].description)) {
										results[k].title = "Removed";
										results[k].url = "Blocked";
										results[k].description = "Due to your current SafeSearch setting, we will not display this result. Do you think this is a mistake? Email <a href='mailto:KestronKA@gmail.com'>KestronKA@gmail.com</a> with any relevant info.";
										results[k].favi = "dne.png";
										results[k].matchNum -= 3;
									}
								}
								if (!same) {
									// console.log('Different')
									results.push(engineResults[j]);
								}
							} catch (e) { console.log(e); }
						}
					} catch (e) { console.log(e); }
				}
                // Ordering of the sorts matters here, matchNum is first so that it gets overridden by resultNum otherwise results are just un-usable
                // In the future more sorting could be done here, e.g. (probably opt-in) you could have device-based results, with no data being sent out
				results.sort(function(a, b) { return b.matchNum - a.matchNum });
				results.sort(function(a, b) { return a.resultNum - b.resultNum });
				options.results = results;
			} else {
				for (var i in engines) {
					options[engines[i] + 'Results'] = results;
					// console.log(options[engines[i] + 'Results'])
				}
			}
		}
        const suggestions = await getSuggestions(query);
        options.suggestions = suggestions;
		let abstractData={};
		await fetch("https://api.duckduckgo.com/?q="+query+"&format=json&pretty=1&no_redirects=1&no_html=1&skip_disambig=1").then(d=>d.json()).then(d=>{
			abstractData={
				txt:d.AbstractText,
				src:d.AbstractURL,
				srcName:d.AbstractSource,
				img:"https://duckduckgo.com"+d.Image,
				head:d.Heading
			};
		});
		options["abstractData"]=abstractData;
		ejs.renderFile('./search.ejs', options, {}, function(err, str) {
			if (err) {
				res.send(err);
				return;
			}
			res.send(str)
		})
		// console.log(googleResults)

	} catch (e) {
		res.send(e)
	}
});
site.get('/url', async (req, res) => {
	let newUrl = req.query.q.split("&sa=")[0];
	res.send("<script>window.top.location.replace(`" + newUrl + "`);</script>");
});
site.get('/get', async (req, res) => {
	let type = req.query.type;
	let query = req.query.q;
	if (query === undefined || query === null) {
		res.send("Whoops! No query was specified.");
		return;
	}
	let page = "";
	switch (type) {
		default:
			page += "We don't have that search engine. If you would like to see it included, email <a href='mailto:kestronka@gmail.com'>KestronKA@gmail.com</a>.";
			break;
		case 'google':
			await fetch("https://www.google.com/search?q=" + query).then(d => d.text()).then(d => {
				let google = new JSDOM(d);
				let results = google.window.document.getElementsByClassName('Gx5Zad fP1Qef xpd EtOod pkphOe');
				let titles = [];
				let urls = [];
				let descs = [];
				if (results.length === 0) {
					page += "No results from Google";
				}
				for (var i = 0; i < results.length; i++) {
					descs.push(results[i].getElementsByClassName("BNeawe s3v9rd AP7Wnd")[0].innerHTML);
					titles.push(results[i].getElementsByClassName("BNeawe vvjwJb AP7Wnd")[0].textContent);
					urls.push(results[i].getElementsByTagName("a")[0].href);
				}
				for (var i = 0; i < titles.length; i++) {
					if (unSafe(ssLvl, titles[i]) || unSafe(ssLvl, urls[i]) || unSafe(ssLvl, descs[i])) {
						titles[i] = "Removed";
						urls[i] = "Blocked";
						descs[i] = "Due to your current SafeSearch setting, we will not display this result. Do you think this is a mistake? Email <a href='mailto:KestronKA@gmail.com'>KestronKA@gmail.com</a> with any relevant info.";
					}
					page += `<hr><span class='url'>${urls[i].split("/url?q=")[1].split("&sa=")[0]}</span><h1><a href='${urls[i].split("/url?q=")[1].split("&sa=")[0]}' class="title">${titles[i]}</a></h1>${descs[i].replace(/�/g, '<i style="font-size: .6em;">∙</i>')}`;
				}
			});
			break;
		case 'bing':
			await fetch("https://www.bing.com/search?q=" + query).then(d => d.text()).then(d => {
				let bing = new JSDOM(d);
				let results = bing.window.document.getElementsByClassName("b_algo");
				let titles = [];
				let urls = [];
				let descs = [];
				for (var i = 0; i < results.length; i++) {
					try {
						titles.push(results[i].getElementsByTagName('a')[0].textContent);
						descs.push(results[i].getElementsByClassName('b_caption')[0].innerHTML.replace(/="\/th/g, '="https://bing.com/th'));
						urls.push(results[i].getElementsByTagName('a')[0].href);
					}
					catch (e) { console.log(e); }
				}
				for (var i = 0; i < titles.length; i++) {
					if (descs[i] === undefined) {
						descs[i] = "";
					}
					if (unSafe(ssLvl, titles[i]) || unSafe(ssLvl, urls[i]) || unSafe(ssLvl, descs[i])) {
						titles[i] = "Removed";
						urls[i] = "Blocked";
						descs[i] = "Due to your current SafeSearch setting, we will not display this result. Do you think this is a mistake? Email <a href='mailto:KestronKA@gmail.com'>KestronKA@gmail.com</a> with any relevant info.";
					}
					page += `<hr><span class='url'>${urls[i]}</span><h1><a href="${urls[i]}" class="title">${titles[i]}</a></h1>${descs[i]}`;
				}
			});
			break;
		case 'ddg':
			await fetch('https://duckduckgo.com/html/?q=' + query).then(d => d.text()).then(d => {
				let duckduckgo = new JSDOM(d);
				let results = duckduckgo.window.document.getElementsByClassName("links_main links_deep result__body");
				let titles = [];
				let urls = [];
				let descs = [];
				for (var i = 0; i < results.length; i++) {
					titles.push(results[i].getElementsByTagName("h2")[0].textContent);
					urls.push("https://" + results[i].getElementsByClassName("result__url")[0].textContent.replace(/ /g, ''));
					descs.push(results[i].getElementsByClassName("result__snippet")[0].innerHTML);
				}
				for (var i = 0; i < titles.length; i++) {
					if (unSafe(ssLvl, titles[i]) || unSafe(ssLvl, urls[i]) || unSafe(ssLvl, descs[i])) {
						titles[i] = "Removed";
						urls[i] = "Blocked";
						descs[i] = "Due to your current SafeSearch setting, we will not display this result. Do you think this is a mistake? Email <a href='mailto:KestronKA@gmail.com'>KestronKA@gmail.com</a> with any relevant info.";
					}
					page += `<hr><span class='url'>${urls[i]}</span><h1><a href="${urls[i]}" class="title">${titles[i]}</a></h1>${descs[i]}`;
				}
			});
			break;
	}
	res.send(page);
});
async function getSuggestions(query) {
    const engines = [
        {
            name: "DuckDuckGo",
            url: "https://duckduckgo.com/ac/?q=" + query + "&type=list"
        },
        {
            name: "Google",
            url: "http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=" + query
        }
	];
    let suggestions = [], suggestedBy = [];
    for (let i in engines) {
        const engine = engines[i].name;
        await fetch(engines[i].url)
        .then(d => d.json())
        .then(suggestionData => {
            for (let suggestion of suggestionData[1]) {
                if (suggestion != query) {
                    if (!suggestions.includes(suggestion)) {
                        suggestions.push(suggestion);
                        suggestedBy.push(engine);
                    } else {
                        let index = suggestions.indexOf(suggestion);
                        suggestedBy[index] += ", "+engine;
                    }
                }
            }
        });
    }
    return { query, suggestions, suggestedBy };
}
site.get('/suggestions', async (req, res) => {
    const query = req.query.q;
    let { suggestions, suggestedBy } = await getSuggestions(query);
    suggestions = suggestions.map(s => {
        //const longest = suggestions.sort((a,b)=>b.length-a.length)[0],
            //space = " ".repeat(longest.length - s.length);
        return s+" - "+suggestedBy[suggestions.indexOf(s)];
    });
    res.send([query, suggestions])
})
site.get('/openSearchRedirect', async (req, res) => {
	// If the the parameter qre (Query Remove Engines) is set remove the names of the engines from the query, and redirects.
	/*
		For example if the query was  "Github login (DuckDuckGo, Google)"  it would remove the (DuckDuckGo, Google),
		and by left with "Github login." This feature exists to remove the names of the engines from the queries 
		given by the search suggestions.
	*/
	let query = req.query.q
	query = query.replace(/ \([a-z, ]+\)$/i, '')
	res.redirect('/search?q=' + query)
})
site.get('/about', async (req, res) => {
	res.send(await fs.readFileSync('static/privacy.html', 'utf-8'));
});
site.get('/makeDefault', async (req, res) => {
	res.send(await fs.readFileSync('static/makeDefault.html', 'utf-8'));
});
site.get('/blocked', async (req, res) => {
	res.send("<script>window.top.location.replace('/');</script>");
});/*
site.get('/images', async (req, res) => {
	let query = req.query.q;
	if (query === undefined || query === null || query.length === 0) {
		res.send("<script>window.top.location.replace('/');</script>");
		return;
	}
	let Results = [];
	await fetch("https://google.com/search?tbm=isch&query=" + query).then(d => d.text()).then(d => {
		let googleImages = new JSDOM(d);
        let results = googleImages.window.document.getElementsByClassName('e3goi');
		let urls = [];
		let imgs = [];
		let titles = [];
		for (var i = 0; i < results.length; i++) {
			titles.push(results[i].getElementsByClassName("fYyStc")[0].textContent);
			imgs.push(results[i].getElementsByClassName("yWs4tf")[0].src);
			let innerHtml = results[i].innerHTML;
			urls.push(innerHtml.split("/url?q=")[1].split("&amp;")[0]);
		}
		for (var i = 0; i < titles.length; i++) {
			Results.push({ "suggestedBy": "<img src='google.png' width='20px'>", "title": titles[i], "img": imgs[i], "url": urls[i], "matchNum": 1 });
		}
	});
	await fetch("https://www.bing.com/images/search?q=" + query).then(d => d.text()).then(d => {
		let bingImages = new JSDOM(d);
		let urls = [];
		let imgs = [];
		let titles = [];
		let results = bingImages.window.document.getElementsByClassName('iuscp isv');
		for (var i = 0; i < results.length; i++) {
			urls.push(results[i].getElementsByClassName("lnkw")[0].innerHTML.split(`href="`)[1].split(`"`)[0]);
			titles.push(results[i].getElementsByClassName("b_dataList")[0].textContent);
			imgs.push(results[i].getElementsByClassName("mimg")[0].src);
		}
		for (var i = 0; i < titles.length; i++) {
			if (imgs[i] !== undefined && imgs[i] !== null && imgs[i].length > 0) {
				Results.push({ "suggestedBy": "<img src='bing.png' width='20px'>", "title": titles[i], "img": imgs[i], "url": urls[i], "matchNum": 1 });
			}
		}
	});
	for (var i = Results.length - 1; i > -1; i--) {
		for (var j = Results.length - 1; j > -1; j--) {
			if (i !== j) {
				try {
					if (Results[i].img === Results[j].img) {
						Results[i].suggestedBy += " " + Results[j].suggestedBy;
						Results[i].matchNum += Results[j].matchNum;
						Results.splice(j, 1);
					}
				}
				catch (e) { console.log(e); }
			}
		}
	}

	let body = "<table><tr>";
	Results.sort(function(a, b) { return b.matchNum - a.matchNum });
	for (var i = 0; i < Results.length; i++) {
		Results[i].url = decodeURIComponent(Results[i].url);
		if (i % 5 === 0) {
			body += "</tr><tr>";
		}
		body += `
			<td>
	 			<a href='${Results[i].img}'><img src='${Results[i].img}'></a><br>
		 		<a href='${Results[i].url}'><span class='url'><i>${Results[i].url}</i></span><br>
		 		<span class='caption'>${Results[i].title}</span></a><br>
		 		<span class='matches'>${Results[i].suggestedBy}</span>
	 		</td>
		`;
	}
	body += "</tr></table>";
	res.send(`
<!DOCTYPE html>
<html>
	<head>
 		<title>${query} - Sleuth Images</title>
	 	<link rel='stylesheet' href='all.css'>
	 	<link rel='stylesheet' href='search.css'>
	 	<link rel='stylesheet' href='imageSearch.css'>
 	</head>
	<body>
 		<header class="header">
				<a href="/"><image src='Sleuth.png' id='logo' /></a><br>
				<form class='tCenter' action='/images' autocomplete='off'>
						<input placeholder='Search...' id='q' name='q' value="${query}"> <input type="submit" value="Search">
				</form>
				<a href='search?q=${query}'>All</a>
		</header><br><br>
		${body}
 	</body>
</html>
 `);
});*/

site.use('/favicon.ico', express.static('static/favicon.jpg'));