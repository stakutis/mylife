

/*

Copyright 2018 Whole Health Plus Technlogy
chris.stakutis@gmail.com

Goal of this unit is to take-in a single-string date + time + calendar-appt and convert it to a UTC proper one and return a structure.  There are lots of layers.

*/


/*

Steps:
- Incoming string is broken-up into semi-fuzzy date + time + message
- This is ASSUMED to be in the users local locale
- Convert that to UTC
- Return a stuctures with the UTCvalue, the day/year/etc, and the 'minutes from now' (just for debugging
- Or structure has 'error' string value (null if no error)

*/


function mytimeConvertStringToPieces(incoming, debugFunc) {
    /* OUTPUT:
       result: String; null or error for user
       incoming: just a re-print of the incoming for debugging
       yyyy: int
       mm: int (in 1-12) based form
       day: int (in 1-31) base form
       hh: int (in 0-23)
       mm: int (in 0-59
       ampm: String "am" or "pm"
       calendarEvent: String The actual event name/words

       WARNING: This just decodes the strings; assumes nothing about locale and makes no translations
       WARNING: Currently, only takes dates in numeric form (e.g. 7/28/2020) not Ascii such as "Aug 14th..."

       CAVEATS: It will accept/skip words like "on" (such as "On 7/12")
       CAVEATS: It will accept/skip words like "at" (such as "at 3pm")
       CAVEATS: It will accept numeric formats like 7/7/18 or 7-15-2022
       CAVEATS: It will try to ignore some stylistics such as commas, such as "7/18,3pm"
       CAVEATS: It will accept time format as such things as "4pm" or "4:30pm" or "4:30 pm".
       CAVEATS: "am" or "pm" is required; this is America
       CAVEATS: There must be date (mm/dd/yy)
       CAVEATS: There SHOULD be a time (hh:mmampm) else it defaults to 12:00pm
       CAVEATS: There SHOULD be a user message too; if not, that string is returned null but other fields in tack
       CAVEATS: The input date part must be EITHER mm/dd or mm/dd/yy or mm/dd/yyyy else error
       CAVEATS: The input time part must be EITHER hh+am/pm or hh:mm+am/pm or a space before the am/pm
     */
    if (!debugFunc) debugFunc=function(str) {}

    let result={
	result: null,
	incoming: incoming,
	yyyy: 2018,
	mo: 07,
	day: 30,
	hh: 12,
	mm: 0,
	ampm: "am",
	calendarEvent: null
    };

    while (1) { // So we can break;
	debugFunc('[incoming:'+incoming);
	let lowerStrings=incoming.toLowerCase();   // simplifies thing
	debugFunc('[lowerString:'+lowerStrings);
	let words=lowerStrings.split(' ');  // BUT some people might use commas or other crap

	// The first word could be 'on', like 'on 07/11'
	if (words[0]=='on') {
	    debugFunc('IGNORING the "on" word');
	    words.shift();
	}

	// Ok, let's see if is a numeric-looking data, eg. 07/14  07/14/2018  07/14/18
	// Which *could* have junk behind it like a comma or semi/colon
	if (words[0].charAt(0) >= '0' && words[0].charAt(0) <='9') {
	    // Process this a number datetring
	    numberString = words[0];
	    // let's remove any trailing gargbage
	    numberString = numberString.replace(';','')
	    numberString = numberString.replace(',','')
	    debugFunc('Will be processing this a numeric data string, cleaned:'+numberString);

	    // Now it could be 07/14  07/14/2018  07/14/18  with either colons or dashes
	    numberString = numberString.replace(/:/g,'/')
	    numberString = numberString.replace(/-/g,'/')
	    debugFunc('Clearning once again:'+numberString);
	    // It could 1, 2, 3 segments
	    let segments=numberString.split('/');
	    if (segments.length <=1 ) {
		result.result ='Data is is not the right format for numbers at all!' +numberString;
		break;
	    }
	    // new we get to convert day/month/year
	    result.mo = parseInt(segments[0]);
	    if (result.mo == 0 || result.mo > 12) {
		result.result = 'The month-value of '+segments[0]+' is not correct';
		break;
	    }
	    result.day = parseInt(segments[1]);
	    if (result.day == 0 || result.day>31) {
		result.result = 'The day-value of '+segments[1]+' is not correct';
		break;
	    }

	    //Ok, year could be 18 2019 or missing
	    if (segments.length==3) {
		let test=parseInt(segments[2]);
		if (test > 2000) result.year = test;
		else result.year = 2000+test
	    }
	    debugFunc(incoming+' -USING '+result.mo+'/'+result.day+'/'+result.year)
	    debugFunc("Remaining worrd list:"+words.join("-"));
	    words.shift();  //  we can NOW look for the time-stamp
	    if (words.length==0) {
		result.result= "Failed to decode the time value; probably missing am or pm or the value";
		break;
	    }
	    debugFunc('looking at next workds0'+words[0]);
	    /*
	      Flavors could be: "at 3pm", '4pm', '3:30am' or '4 pm'...the rest of the appointment
	      So really it must be this:  "3pm"  "4pm" 4:30am" or "4:30"+"pm"
	      So, the word MUST have an ampm or if not add-it into the one following
	    */
	    if (words[0]=='at') words.shift();  // ignore
	    // next, insist on ampm
	    if (words[0].indexOf('am') == -1 && words[0].indexOf('pm') == -1) {
		// WELL there better by another guy with ampm and we can advance; ELSE we complain
		if (!words.length>1 ||
		    (words[1] != 'am' && words[1]!='pm')) {
		    result.result = "Sorry, the time value must specify am or pm.";
		    break;
		};
		words[1]=words[0]+words[1];
		words.shift(); // No longer need the prior
	    }
	    // Let's abosrb-off the ampm
	    result.ampm=words[0].substr(words[0].length-2);
	    words[0]=words[0].substr(0,words[0].length-2);  // NOW we like "3" or "12" or "4:45"
	    let elements=words[0].split(':')
	    result.hh=parseInt(elements[0]);
	    if (result.hh>12) {
		result.result = "Bad hour value detetcted of:"+elements[0];
		break;
	    }
	    if (elements.length>1) result.mm=parseInt(elements[1]);
	    if (result.mm>59) {
		result.result = "Bad minute value detected of:"+elements[1];
		break;
	    }
	    // Now we're done with that last word;  remove it and rebuild their output
	    words.shift();
	    result.customerMessage = words.join(' ');
	    debugFunc('HH:'+result.hh+' MM:'+result.mm+' ampm:'+result.ampm+' REST:'+result.customerMessage);
	    if (!result.customerMessage || result.customerMessage.length<=0) {
		result.result = "Sorry, we didn't find any message to your calendar quest";
		break;
	    }
	    if (result.ampm=='pm') result.hh=result.hh+12;
	    let dateStr=""+result.year+"-"+makeTwo(result.mo)+"-"+makeTwo(result.day)+"T"+makeTwo(result.hh)+":"+makeTwo(result.mm);
	    //console.log("Date Str of AFTER MAKE TWO:"+dateStr);
	    result.dd = new Date(dateStr);
	    //console.log("ANd result is:",result.dd);
	}
	else {
	    result.result="Cannot handle a non fully numeric input date format.";
	    break;
	}
	break;
    } // While
    return result;
}

function makeTwo(str) {
    str=''+str;
    if (str.length==1) str='0'+str;
    return str;
}


function mytimeIsFailure(validation, expectFailure, expectation) {
    if (!validation.result || expectFailure) {
	if (!expectFailure) {
	    let counts=0;
	    if (expectation.yyyy != validation.yyyy) counts++;
	    if (expectation.mo != validation.mo) counts++;
	    if (expectation.day != validation.day) counts++;
	    if (expectation.hr != validation.hr) counts++;
	    if (expectation.mm != validation.mm) counts++;
	    if (expectation.ampm != validation.ampm) counts++;
	    if (!counts) {
		//console.log("ALL EXPECTED VALUES PASSED!");
	    }
	    else {
		console.log("Expected values didn't pass, got:",validation," expectation:",expectation);
		return 1;
	    }
	}
	console.log("SUCCESS for "+validation.incoming);
	return 0;
    }
    console.log("FAILED: Input is: "+validation.incoming+" Result:"+validation.result+" Details",validation);
    return 1;
}

function mytimeTestAll() {

    let errs=0;
    // Simplest
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "07/23/2018 3pm Go to store"),0,
	{yyyy:2018,mo:7,day:23,hh:3,mm:0,ampm:"pm"});

    // Doesn't have a year
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "07/24 4pm Go to store"),0,
	{yyyy:2018,mo:7,day:24,hh:4,mm:0,ampm:"pm"});

    // Has a space after am/pm
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "07/24 4 pm Go to store"),0,  // NOTE THE SPACE w/pm
	{yyyy:2018,mo:7,day:24,hh:4,mm:0,ampm:"pm"});

    // Has a MM value in time
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "07/24/2018 4:12am Go to store"),0,  // NOTE THE SPACE w/pm
	{yyyy:2018,mo:7,day:24,hh:4,mm:12,ampm:"am"});


    // BAD MONTH
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "14/24/2018 4:12am Go to store"),1,  
	{yyyy:2018,mo:7,day:24,hh:4,mm:12,ampm:"am"});

    // missing am/pm
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "07/24/2018 4 Go to store"),1,  
	{yyyy:2018,mo:7,day:24,hh:4,mm:0,ampm:"am"});

    // Using non-zero-leading-values
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "7/24/2018 4:34pm Go to store"),0,  
	{yyyy:2018,mo:7,day:24,hh:4,mm:34,ampm:"pm"});


    // Missing a calendar event
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "7/24/2018 4:34pm "),1,  
	{yyyy:2018,mo:7,day:24,hh:4,mm:34,ampm:"pm"});


    // odd test
    errs+=mytimeIsFailure(
	mytimeConvertStringToPieces(
	    "7/30 8am pizza pizzam "),0,  
	{yyyy:2018,mo:7,day:30,hh:8,mm:0,ampm:"am"});


    return errs;
}

function mytimeConvertLocaleToUTC(din) {
    console.log('date in is:',din);
    let dout=new Date();
    dout.setTime(din.getTime() + 4*60*60*1000);
//    console.log('convert returning:',dout);
    return dout;
}

function howFarFromNow(d) {
    console.log("Lets do this in stages, got d:",d);
    console.log("Time sent in is:"+d.getTime());
    console.log("Time right now is:"+new Date().getTime());
    let diff=d.getTime() - new Date().getTime();
    console.log("Diff in ms is:"+diff);
    diff = diff / 1000;
    console.log("Diff in seconds is:"+diff);
    diff = diff / 60;
    console.log("Diff in minutes is:"+diff);
    diff = diff / 60;
    console.log("Diff in hours is:"+diff);
}

function run() {
    console.log("total failures:"+mytimeTestAll());
}

run()
module.exports.mytimeConvertLocaleToUTC = mytimeConvertLocaleToUTC;
module.exports.mytimeConvertStringToPieces = mytimeConvertStringToPieces;



