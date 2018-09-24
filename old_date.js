function getMonth(str) {
    str=str.toLowerCase(str);
    switch (str) {
    case 'jan':
    case 'january': return '01';
    case 'feb':
    case 'february': return '02';
    case 'mar':
    case 'march': return '03';
    case 'apr':
    case 'april': return '04';
    case 'may': return '05';
    case 'jun':
    case 'june': return '06';
    case 'jul':
    case 'july': return '07';
    case 'aug':
    case 'august': return '08';
    case 'sep':
    case 'september': return '09';
    case 'oct':
    case 'october': return '10';
    case 'nov':
    case 'november': return '11';
    case 'dec':
    case 'december': return '12';
    default: return null;
    }
}

function dateStrToUTC(incoming) {
    console.log('[incoming:'+incoming);
    let lowerStrings=incoming.toLowerCase();   // simplifies thing
    console.log('[lowerString:'+lowerStrings);
    let words=lowerStrings.split(' ');  // BUT some people might now commos or other crap

    // The first word could be 'on', like 'on 07/11'
    if (words[0]=='on') {
	console.log('IGNORING the "on" word');
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
	console.log('Will be processing this a numeric data string, cleaned:'+numberString);

	// Now it could be 07/14  07/14/2018  07/14/18  with either colons or dashes
	numberString = numberString.replace(/:/g,'/')
	numberString = numberString.replace(/-/g,'/')
	console.log('Clearning once again:'+numberString);
	// It could 1, 2, 3 segments
	let segments=numberString.split('/');
	if (segments.length <=1 ) 
	    return 'Data is is not the right format for numbers at all!' +numberString;
	// new we get to convert day/month/year
	let year=2018;
	let month = parseInt(segments[0]);
	if (month == 0 || month > 12) {
	    return 'The month-value of '+segments[0]+' is not correct';
	}
	let day = parseInt(segments[1]);
	if (day == 0 || day>31) {
	    return 'The day-value of '+segments[1]+' is not correct';
	}

	//Ok, year could be 18 2019 or missing
	if (segments.length==3) {
	    let test=parseInt(segments[2]);
	    if (test > 2000) year = test;
	    else year = 2000+test
	}
	console.log(incoming+' -USING '+month+'/'+day+'/'+year)
	console.log("Remaining worrd list:"+words.join("-"));
	words.shift();  //  we can NOW look for the time-stamp
	if (words.length==0) {
	    return "Failed to decode the time value; probably missing am or pm or the value";
	}
	console.log('looking at next workds0'+words[0]);
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
		    return "Sorry, the time value must specify am or pm.";
		};
	    words[1]=words[0]+words[1];
	    words.shift(); // No longer need the prior
	}
	// Let's abosrb-off the ampm
	let ampm=words[0].substr(words[0].length-2);
	words[0]=words[0].substr(0,words[0].length-2);  // NOW we like "3" or "12" or "4:45"
	let elements=words[0].split(':')
	let hh=parseInt(elements[0]);
	if (hh>12) return "Bad hour value detetcted of:"+elements[0];
	let mm=0;
	if (elements.length>1) mm=parseInt(elements[1]);
	if (mm>59) return "Bad minute value detected of:"+elements[1];
	// Now we're done with that last word;  remove it and rebuild their output
	words.shift();
	let customerMessage =words.join(' ');
	console.log('HH:'+hh+' MM:'+mm+' ampm:'+ampm+' REST:'+customerMessage);
	if (strlen(customerMessage)<=0) return "Sorry, we didn't find any message with you calendar quest";
	
//	if (ampm=='pm') hh=hh+12;
	return new Date(year,month+1,day,hh,mm);;
    }
}


function convertMiscDateStringToUTC(incoming) { // OLD  
    /*
      Handle these various formats
      Jun[e] XX[th,st,nd,rd,,] [YYYY] 3:00[ ]{am/pm}
      Jun 5th 3:00  (no year)
      6-4[-2018] 3:15[ ]{am/pm}
      6/4[/2018]

      if no am/pm:
      if 7..HH..11 assume am
      if 12..HH..6 assume pm
    */
    //console.log('convert from:'+str);
    let str=incoming;
    try {
	str = str.replace(',','');  // Strip out commas
	str = str.replace('@','');  // Strip out at
	str = str.replace('at','');  // Strip out at
	let parts=str.split(' ');
	let month, day, year;
	let mmddyyy, timeStr;
	parts[0]=parts[0].replace('-','/');  // Coerce to use slash if at all
	mmddyyyy = parts[0].split('/');
	//console.log('mmddyyyy:'+mmddyyyy);

	/*
	 * First, see if it is a numeric format like:
	 *   6/4/2018
	 *   6/4/2018 3:00
	 *   6/4/2018 3:00pm
	 *   6/4/2018 3:00 pm
	 *   6/4 3:00pm
	 */
	if (mmddyyyy.length > 1) {
	    //console.log('It is a digit-date');
	    month=mmddyyyy[0];
	    day=mmddyyyy[1];
	    /** See if year is present **/
	    if (mmddyyyy.length > 2) {
		year=mmddyyyy[2];
	    }
	    else {
		/** No year present **/
		year=''+(new Date().getFullYear());
	    }
	    /** Now, accumulate all the time string fields for the bottom part of processing **/
	    if (parts.length < 2)   // Missing time stamp entirely
		timeStr = "12:00pm";
	    else {
		/* Recall, could be: "3:00" "3:00am" "3:00 am" */
		timeStr = parts[1];
		if (parts.length == 3) timeStr+=parts[2];  // Force '3:00 pm' to '3:00pm'
	    }
	}
	else {
	    /* Format is one of:
	       Jun 4th 2018 timeStr
	       Jun 3 timeStr
	    */
	    month=getMonth(parts[0]);
	    //console.log('Parse month:',month);
	    if (parts.length==1) return null;  // User didn't specify DD or rest
	    parts[1]=parts[1].toLowerCase();
	    /* Rip-off any decorators */
	    parts[1]=parts[1].replace('th','');
	    parts[1]=parts[1].replace('st','');
	    parts[1]=parts[1].replace('dn','');
	    parts[1]=parts[1].replace('rd','');
	    day=parts[1];
	    //console.log('day is:'+day);
	    if (parts.length==2) {
		// User only specified: June 12 ; so assume current year and noon
		year=''+(new Date().getFullYear());
		timeStr="12:00pm";
	    } 
	    else {
		year=parts[2];
		// They might not have specified the year!
		let intYear=parseInt(year);
		if (intYear<2018 || intYear>2025) {
		    // E.g. Jun 15 3:00 pm
		    timeStr=year;
		    year=''+new Date().getFullYear();
		    if (parts.length==4) timeStr+=parts[3];
		}
		else  {
		    if (parts.length==3) { // User gave no time so assume noon
			timeStr ="12:00pm";
		    } else {
			timeStr=parts[3];
			if (parts.length==5) timeStr+=parts[4]; // Force '3:00 pm' to '3:00pm'
		    }
		}
	    }
	}

	/* Ok, timeStr might be: '3:00' or '3:00a.m.' or '3:00am' or '3pm' */
	timeStr=timeStr.toLowerCase();
	timeStr.replace('a.m.','am');
	timeStr.replace('p.m.','pm');
	if (timeStr.indexOf('am') == -1 && timeStr.indexOf('pm') == -1) {
	    /*
              if 7..HH..11 assume am
	      if 12..HH..6 assume pm
	    */
	    let hh_int = parseInt(timeStr.split(':')[0]);
	    if (hh_int >=7 && hh_int <=11) timeStr+="am";
	    else
		if (hh_int >=12 && hh_int <=6) timeStr+="pm";
	    else return null;  // Can't happen
	}
	timeStr=timeStr.replace('am',' am');
	timeStr=timeStr.replace('pm',' pm');

	/* Let's see if they didn't use a colon in the time */
	if (timeStr.indexOf(':')==-1) {
	    timeStr=timeStr.split(' ')[0]+':00 '+timeStr.split(' ')[1];
	}

	/* Let's see if they are asking for a month into next year */
	let curMonth=new Date().getMonth()+1;
	let intMonth=parseInt(month);
	if (intMonth < curMonth)
	    year=''+(parseInt(year)+1);

	let dateStr=month+'-'+day+'-'+year+' '+timeStr;
	//console.log("Using:"+dateStr);
	let UTC=new Date(dateStr);
	//console.log("UTC:"+UTC);
	//console.log("---Str:"+new Date(UTC));
	console.log('Incoming:['+incoming+'] result:['+UTC+']');
	return UTC;
    } catch (e) {
	console.log('Failed:'+e);
	return null;
    }
}

function convertMiscDateStringInLocaleToUTC(str) {
    console.log('convertMiscDateStringInLocaleToUTC:'+str);
    let d=convertMiscDateStringToUTC(str);
    if (!d) return null; // Failed to convert dateStr
    console.log('  as New Date():'+new Date(d));
    d = d.getTime() + 4*60*60*1000;
    let dd=new Date(); dd.setTime(d);
    console.log('  as      shift:'+dd);
    console.log('Minutes from now:'+(d - new Date().getTime())/1000/60);
    return d;
}


function dayStr2Num(d1) {
    //console.log('dayStr2Num:'+d1);
    switch (d1) {
    case '1':
    case '1st':
    case 'one':
    case 'first': d1=1; break;
    case '2':
    case '2nd':
    case 'to':
    case 'too':
    case 'two':
    case 'second': d1=2; break;
    case '3':
    case '3rd':
    case 'three':
    case 'third': d1=3; break;
    case '4':
    case '4th':
    case 'four':
    case 'fourth': d1=4; break;
    case '5':
    case '5th':
    case 'five':
    case 'fifth': d1=5; break;
    case '6':
    case '6th':
    case 'six':
    case 'sixth': d1=6; break;
    case '7':
    case '7th':
    case 'seven':
    case 'seventh':
	d1=7; break;
    case '8':
    case '8th':
    case 'eight':
    case 'eighth':
	d1=8; break;
    case '9':
    case '9th':
    case 'ninth':
    case 'nine':
	d1=9; break;
    case '10':
    case '10th':
    case 'ten':
    case 'tenth':
	d1=10; break;
    case '11':
    case '11th':
    case 'eleven':
    case 'eleventh':
	d1=11; break;
    case '12':
    case '12th':
    case 'twelve':
    case 'twelveth':
	d1=12; break;
    case '13':
    case '13th':
    case 'thirteen':
    case 'thirteenth':
	d1=13; break;
    case '14':
    case '14th':
    case 'fourteen':
    case 'fourteenth':
	d1=14; break;
    case '15':
    case '15th':
    case 'fifteen':
    case 'fifteenth':
	d1=15; break;
    case '16':
    case '16th':
    case 'sixteen':
    case 'sixteenth':
	d1=16; break;
    case '17':
    case '17th':
    case 'seventeen':
    case 'seventeenth':
	d1=17; break;
    case '18':
    case '18th':
    case 'eighteen':
    case 'eighteenth':
	d1=18; break;
    case '19':
    case '19th':
    case 'nineteen':
    case 'nineteenth':
	d1=19; break;
    case '20':
    case '20th':
    case 'twenty':
    case 'twentyth':
	d1=20; break;
    case '30':
    case '30th':
    case 'thirty':
    case 'thirtyth':
	d1=30; break;
    default:
	console.log('bad day:'+d1);
	return null;
    }
    return d1;
}

function convertSpokenDateStr(incoming) {
    // june twenty third at three p.m.
    //console.log('Incoming:'+incoming);
    let str=incoming;
    try {
	str=str.toLowerCase();
	str=str.replace('a.m.','am');
	str=str.replace('p.m.','pm');
	str=str.replace('oclock.','');
	str=str.replace("o'clock",'');
	str=str.replace(',','');
	str=str.replace('   ',' ');
	str=str.replace('  ',' ');
	//console.log('After stripped and stretched:'+str);

	// absorb am/pm and remove it
	let timeStr,ampm="am";
	if (str.indexOf("pm")!=-1) ampm="pm";
	str=str.replace("am","");
	str=str.replace("pm","");

	let mon, day, year;
	mon=str.split(' ')[0];
	
	switch (mon) {
	case 'january': mon=1; break;
	case 'february': mon=2; break;
	case 'march': mon=3; break;
	case 'april': mon=4; break;
	case 'may': mon=5; break;
	case 'june': mon=6; break;
	case 'july': mon=7; break;
	case 'august': mon=8; break;
	case 'september': mon=9; break;
	case 'october': mon=10; break;
	case 'november': mon=11; break;
	case 'december': mon=12; break;
	default:
	    console.log('Unknown month:'+mon);
	    return 'Unknown month '+mon;
	}
	//console.log('Got mon:'+mon);

	str=str.substr(str.indexOf(' ')+1).trim();  // Rest of string (dateStr timeStr)
	//console.log('Rest of dateStr is:['+str+']');

	let d1=0, d2=0;
	let h1='', h2='00';
/*
	parts=str.split('at');
	let timeStr=parts[1].trim();
	str=parts[0].trim();
	//console.log('dateStr:['+str+']timeStr:['+timeStr+']');
*/
	parts=str.split(' '); 
/*
  Two word examples:
  5th 1pm
  those are clear, first one is day1 and 2nd is h1.
  Four word examples:
  Twenty first 12 thirty 
  d1,d2, h1, h2
  Three word examples:
  case a:  20th 1 30pm   d1 h1 h2
  case b:  20 fith 2pm   d1 d2 h1
  If the last number is >12 then it must be case-a else case-b
*/
	if (parts.length==2) {
	    d1=dayStr2Num(parts[0]);
	    h1=dayStr2Num(parts[1]);
	    //console.log('parts==2 d1:'+d1+' h1:'+h1);
	}
	else
	    if (parts.length==4) {
		d1=dayStr2Num(parts[0]);
		d2=dayStr2Num(parts[1]);
		h1=dayStr2Num(parts[2]);
		h2=dayStr2Num(parts[3]);
		//console.log('parts==4 d1:'+d1+' d2:'+d2+' h1:'+h1+' h2:'+h2);
	    }
	else {
	    // Uhg, the 3-param case, see note above
	    d1=dayStr2Num(parts[0]);
	    h2=dayStr2Num(parts[2]);
	    if (h2 > 12) {
		// case-a
		//console.log('Case-a');
		h1=dayStr2Num(parts[1]);
	    }
	    else {
		// Case-b
		//console.log('Case-b');
		d2=dayStr2Num(parts[1]);
		//console.log('case-b trying to convert '+parts[1]+' got:'+d2);
		h1=dayStr2Num(parts[2]);
		h2="00";
	    }
	    //console.log('parts==3 d1:'+d1+' d2:'+d2+' h1:'+h1+' h2:'+h2);
	}
	
	if (d1==null) {
	    console.log('Could not translate the first part of the date '+parts[0]);
	    return 'Could not translate the first part of the date '+parts[0];
	}
	if (d2==null) {
	    console.log('Could not translate the second part of the date '+parts[0]);
	    return 'Could not translate the second part of the date '+parts[0];
	}
	if (h1==null) {
	    console.log('Could not translate the first part of the time '+parts[0]);
	    return 'Could not translate the first part of the time '+parts[0];
	}
	if (h2==null) {
	    console.log('Could not translate the second part of the time '+parts[0]);
	    return 'Could not translate the second part of the time '+parts[0];
	}
	day = d1+d2;
	timeStr=''+h1+':'+h2+' '+ampm;

	year=''+new Date().getFullYear();
	/* Let's see if they are asking for a month into next year */
	let curMonth=new Date().getMonth()+1;
	let intMonth=mon;
	if (intMonth < curMonth)
	    year=''+(parseInt(year)+1);

	let dateStr=mon+'-'+day+'-'+year+' '+timeStr;
	//console.log("Using:"+dateStr);
	let UTC=new Date(dateStr);
	//console.log("UTC:"+UTC);
	//console.log("---Str:"+new Date(UTC));
	console.log('Incoming:['+incoming+'] result:['+UTC+']');
	return UTC;
    } catch (e) {
	console.log('convertDateStr exception:',e);
	return "Unknown exception "+e;
    }
}

function isValidSpokenDateString(str) {
    str=str.toLowerCase(str);
    str=str.replace('a.m.','am');
    str=str.replace('p.m.','am');
//    if (str.indexOf(' at ')== -1) return "Missing the word AT.";
    if (str.indexOf('am')== -1) return "Missing A.M. or P.M. ";
    return null;
}

function convertSpokenDateStringInLocaleToUTC(str) {
    let ret=isValidSpokenDateString(str);
    if (ret) return "*************************************** "+ret;
    console.log('convertMiscDateStringInLocaleToUTC:'+str);
    let d=convertSpokenDateStringToUTC_OLD(str);
    if (typeof d == 'string') return d; // Failed to convert dateStr
    console.log('  as New Date():'+new Date(d));
    d = d.getTime() + 4*60*60*1000;
    let dd=new Date(); dd.setTime(d);
    console.log('  as      shift:'+dd);
    console.log('Minutes from now:'+(d - new Date().getTime())/1000/60);
    return d;
}


