
function valueOf(word) {
    if (word=="none") return 0;
    if (word=="mild") return 1;
    if (word=="moderate") return 2;
    if (word=="severe") return 3;
    if (word=="extreme") return 4;
    console.log("oh no, unknown word:"+word);
    return 0;
}

module.exports={
    handleCompletion: function(self, subject, survey, answers) {
	console.log('In LibraryQuestionnaireHip!');
	let total=0,interval=0;
	let msg="";
	for (let i=0; i<answers.answers.length; i++) total+=valueOf(answers.answers[i]);
	msg=", Totalling your survey, ... the raw total is "+total+". , ";
	switch (total) {
	    case 0: interval=100.000; break;
	    case 1: interval=92.340; break;
	    case 2: interval=85.257; break;
	    case 3: interval=80.550; break;
	    case 4: interval=76.776; break;
	    case 5: interval=73.472; break;
	    case 6: interval=70.426; break;
	    case 7: interval=67.516; break;
	    case 8: interval=64.664; break;
	    case 9: interval=61.815; break;
	    case 10: interval=58.930; break;
	    case 11: interval=55.985; break;
	    case 12: interval=52.965; break;
	    case 13: interval=49.858; break;
	    case 14: interval=46.652; break;
	    case 15: interval=43.335; break;
	    case 16: interval=39.902; break;
	    case 17: interval=36.363; break;
	    case 18: interval=32.735; break;
	    case 19: interval=29.009; break;
	    case 20: interval=25.103; break;
	    case 21: interval=20.805; break;
	    case 22: interval=15.633; break;
	    case 23: interval=8.104; break;
	    case 24: interval=0.0; break;
	}
	msg += " Your interval percent is "+interval+". ";
	if (interval > 70) msg+= ", Good for you! , ";
	if (interval < 50) msg+= ", Hmmm, seems like you need to work on your exercises more! , ";
	self.attributes.prefix += msg;
	return {
	}
    }
}
