//For speech recognition in the search bar - works, but not implemented yet.
function speak(text) {
    var u = new SpeechSynthesisUtterance();
    u.text = text;
    u.lang = 'en-US';
    speechSynthesis.speak(u);
}
function listen(callback){
	var recognition = new webkitSpeechRecognition();
	recognition.continuous = false;
	recognition.interimResults = false;
	recognition.onend = function (e) {
			return null;
	};
	recognition.onresult = function (e) {
			recognition.onend = null;
			if(callback){
				callback(e.results[0][0].transcript);
			}
	}
	recognition.start();
}