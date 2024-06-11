// This file contains functions that are used by both the main Fauxbar page and its background page. //

// Create a function to wrap around .focus() for debugging GitHub issue #47. Derived from https://stackoverflow.com/a/26450186/206410
// $(document).ready(function(){
	$.fn.FocusElement = function(breadcrumb) {
		console.log("FOCUSING ELEMENT: "+breadcrumb);
	    return $(this).focus();
	};
// }



// http://stackoverflow.com/questions/4155032/operating-system-detection-by-java-or-javascript/4155078#4155078
var appVersion = navigator.appVersion;
if (appVersion.indexOf("Win") != -1) {
	window.OS = "Windows";
}
else if (appVersion.indexOf("Mac") != -1) {
	window.OS = "Mac";
	$(document).ready(function(){
		$("head").append('<link href="/css/fauxbar-mac.css" media="screen" rel="stylesheet" type="text/css" />');
	});
}
else if (appVersion.indexOf("X11") != -1) {
	window.OS = "UNIX";
}
else if (appVersion.indexOf("Linux") != -1) {
	window.OS = "Linux";
}
else {
	window.OS = "Unknown";
}


// Get the value of a parameter from the page's hash.
// Example: If page's hash is "#foo=bar", getHashVar('foo') will return 'bar'
function getHashVar(varName) {
	var hash = window.location.hash.substr(1);
	var pieces = explode("&", hash);
	for (var p in pieces) {
		if (explode("=", pieces[p])[0] == varName) {
			return urldecode(explode("=", pieces[p])[1]);
		}
	}
	return '';
}

// Select a search engine to use in the Search Box. Function name is kind of misleading.
function selectOpenSearchType(el, focusToo) {
	if (document.title == "fauxbar.background") {
		return false;
	}
	if ($(".shortname", el).length == 0) {
		localStorage.option_optionpage = "option_section_searchengines";

		// If "Edit search engines..." is selected, load the options.
		// If options are already loaded, switch to the Search Box subpage
		if (getHashVar("options") != 1) {
			if (window.location.hash.length == 0) {
				window.location.hash = "#options=1";
			} else {
				window.location.hash += "&options=1";
			}
			window.location.reload();
		} else {
			changeOptionPage("#option_section_searchengines");
		}
		$("#opensearch_menufocus").blur();
		return false;
	}
	$("img.opensearch_selectedicon").attr("src", $("img", el).attr("src"));
	var shortNameHtml = $(".shortname", el).html();
	var osi = $("#opensearchinput");
	if ($(".shortname", el).length) {
		osi.attr("placeholder",str_replace('"','&quot;',shortNameHtml));
	}
	window.openSearchShortname = shortNameHtml;
	window.openSearchEncoding = $(el).attr("encoding");
	var newTitle = "Search using "+str_replace('"','&quot',shortNameHtml);
	osi.attr("title",newTitle).attr("realtitle",newTitle);
	if (focusToo == true || window.changeDefaultOpenSearchType == true) {
		window.changeDefaultOpenSearchType = null;
		if (focusToo) {
			osi.focus();
			osi.select();
		}
		if (openDb()) {
			window.db.transaction(function (tx) {
				tx.executeSql('UPDATE opensearches SET isdefault = 0');
				tx.executeSql('UPDATE opensearches SET isdefault = 1 WHERE shortname = ?', [window.openSearchShortname]);
				localStorage.osshortname = window.openSearchShortname;
				localStorage.osiconsrc = $(".vertline2 img", el).attr("src");
			}, function(t){
				errorHandler(t, getLineInfo());
			}, function(){
				chrome.runtime.sendMessage(null, "backup search engines");
			});
		}
	}
	$('#opensearchmenu .menuitem').removeClass("bold");
	$('#opensearchmenu .menuitem[shortname="'+str_replace('"','&quot;',window.openSearchShortname)+'"]').addClass("bold");
}



// Start the indexing process
function reindex() {
	window.doneApplyingFrecencyScores = 0;
	if (openDb(true)) {
		$("#addresswrapper").css("cursor","wait");
		window.indexStatus = "Initiating..."; // Step 1
		chrome.runtime.sendMessage(null, {message:"currentStatus",status:"Initiating...", step:1}); // Step 1
		index();
	}
}


// Below are mostly borrowed functions from other sources.
// If you see your function below, thank you!

////////////////////////////////////////////////////////////////////////////




// http://phpjs.org/functions/explode:396
function explode (delimiter, string, limit) {
	var emptyArray = {
		0: ''
	};

	// third argument is not required
	if (arguments.length < 2 || typeof arguments[0] == 'undefined' || typeof arguments[1] == 'undefined') {
		return null;
	}

	if (delimiter === '' || delimiter === false || delimiter === null) {
		return false;
	}

	if (typeof delimiter == 'function' || typeof delimiter == 'object' || typeof string == 'function' || typeof string == 'object') {
		return emptyArray;
	}

	if (delimiter === true) {
		delimiter = '1';
	}

	if (!limit) {
		return string.toString().split(delimiter.toString());
	} else {
		// support for limit argument
		var splitted = string.toString().split(delimiter.toString());
		var partA = splitted.splice(0, limit - 1);
		var partB = splitted.join(delimiter.toString());
		partA.push(partB);
		return partA;
	}
}


// http://phpjs.org/functions/str_replace:527
function str_replace (search, replace, subject, count) {
	var i = 0,
		j = 0,
		temp = '',
		repl = '',
		sl = 0,
		fl = 0,
		f = [].concat(search),
		r = [].concat(replace),
		s = subject,
		ra = Object.prototype.toString.call(r) === '[object Array]',
		sa = Object.prototype.toString.call(s) === '[object Array]';
	s = [].concat(s);
	if (count) {
		this.window[count] = 0;
	}

	for (i = 0, sl = s.length; i < sl; i++) {
		if (s[i] === '') {
			continue;
		}
		for (j = 0, fl = f.length; j < fl; j++) {
			temp = s[i] + '';
			repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
			s[i] = (temp).split(f[j]).join(repl);
			if (count && s[i] !== temp) {
				this.window[count] += (temp.length - s[i].length) / f[j].length;
			}
		}
	}
	return sa ? s : s[0];
}





// http://phpjs.org/functions/number_format:481
function number_format (number, decimals, dec_point, thousands_sep) {
    // Strip all characters but numerical ones.
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

// http://phpjs.org/functions/urldecode:572
// Modified to catch malformed URI errors
function urldecode (str) {
	try {
		return decodeURIComponent((str + '').replace(/\+/g, '%20'));
	} catch(e) {
		console.log(e);
		if (e.message) {
			if (e.message == "URI malformed") {
				return str;
			}
			return 'Error: '+e.message;
		} else {
			return 'Error: Unable to decode URL';
		}
	}
}

class QuerySpec {
	_collectionName;
	_mapPreFn = [];
	_filterFn = [];
	_sortFn;
	_mapPostFn = [];
	_overallFn = [];
	_limit = -1;
	_skip = -1;

	constructor(collectionName) {
		this._collectionName = collectionName;
	}

	filter(filterFn) {
		this._filterFn.push(filterFn);
		return this;
	}
	select = this.filter;
	where = this.filter;

	mapPre(mapPreFn) {
		this._mapPreFn.push(mapPreFn);
		return this;
	}

	sort(sortFn) {
		this._sortFn = sortFn;
		return this;
	}

	mapPost(mapPostFn) {
		this._mapPostFn.push(mapPostFn);
		return this;
	}

	project(...args) {
		return this.mapPost(
			(row) => {
				var result = {};
				for (var arg of args) {
					result[arg] = row[arg];
				}
				return result;
			}
		);
	}

	finalProcessing(overallFn) {
		this._overallFn.push(overallFn);
		return this;
	}

	limit(limit) {
		this._limit = limit;
		return this;
	}

	skip(skip) {
		this._skip = skip;
		return this;
	}
	offset = this.skip;

	exec(tx) {
		console.log(`selecting from ${this._collectionName} with ${tx.backgroundWindow.data[this._collectionName].length} entries`);
		var results = tx.backgroundWindow.data[this._collectionName].slice();
		for (var mapPreFn of this._mapPreFn) {
			results = results.map(mapPreFn);
		}
		for (var filterFn of this._filterFn) {
			results = results.filter(filterFn);
		}
		if (this._sortFn) {
			results = results.sort(this._sortFn);
		}
		for (var mapPostFn of this._mapPostFn) {
			results = results.map(mapPostFn);
		}
		for (var overallFn of this._overallFn) {
			results = overallFn(results);
		}
		if (this._skip > 0) {
			results = results.slice(this._skip);
		}
		if (this._limit > 0) {
			results = results.slice(0, this._limit);
		}
		console.log(`got ${results.length} results`);
		results.item = results.at;
		return { rows: results };
	}
}

function loadStaticData(backgroundWindow, name) {
	if (!backgroundWindow.data[name]) {
		$.getJSON(chrome.extension.getURL('/data/' + name + '.json'), function(json) {
				if (json === null) {
					json = [];
				}
				backgroundWindow.data[name] = json;
				console.log("loaded", name, backgroundWindow.data[name].length);
			});
		console.log("scheduled", name);
	}
}

// Initialize/create the database
function openDb(force) {
	// Don't load database if page isn't ready
	if (!$(document).ready()) {
		return false;
	}
	var backgroundWindow = chrome.extension.getBackgroundPage();

	console.trace("openDb", backgroundWindow.data);
	if (!backgroundWindow.data) {
		backgroundWindow.data = {};
	}
	for (var i of ["urls", "inputurls", "opensearches", "searchqueries", "thumbs", "tags", "errors"]) {
		loadStaticData(backgroundWindow, i);
	}
	window.data = backgroundWindow.data;

	if (!backgroundWindow.db) {
		backgroundWindow._tx = {
			backgroundWindow: backgroundWindow,
			executeSql: function(sql, args, cb, err) {
				console.trace("executeSql", arguments);
			},
			exec: function(spec, cb, err) {
				const tx = backgroundWindow._tx;
				try {
					var result = spec.exec(tx, cb);
					cb(tx, result);
				} catch(e) {
					if (err) {
						console.trace('generic error', e);
						tx.e = e;
						err(tx, e);
					} else {
						throw(e);
					}
				}
			},
			query: function(collectionName) {
				return new QuerySpec(collectionName);
			},
			insert: function(collectionName) {
				// FIXME
			},
			delete: function(collectionName) {
				// FIXME
			},
			update: function(collectionName) {
				// FIXME
			},
		};
		backgroundWindow.db = {
			readTransaction: function(fn, err, success) {
				console.trace("readTransaction", arguments);
				const tx = backgroundWindow._tx;
				try {
					fn(tx);
					if (success) success(tx);
				} catch(e) {
					if (err) {
						console.trace('generic error', e);
						tx.e = e;
						err(tx);
					} else {
						throw(e);
					}
				}
			},
			transaction: function(fn, err, success) {
				console.trace("transaction", arguments);
				const tx = backgroundWindow._tx;
				try {
					fn(tx);
					if (success) success(tx);
				} catch(e) {
					if (err) {
						console.trace('generic error', e);
						tx.e = e;
						err(tx);
					} else {
						throw(e);
					}
				}
			},
		};
	}
	window.db = backgroundWindow.db;

	var res = localStorage.indexComplete == 1 || force == true;
	console.log("openDb done", res);
	return res;
}

// errorHandler catches errors when SQL statements don't work.
// transaction contains the SQL error code and message
// lineInfo contains contains the line number and filename for where the error came from
function errorHandler(transaction, lineInfo) {
	if (!window.goingToUrl) {
		console.trace('generic error', transaction.e);
	}
}
