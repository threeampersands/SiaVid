///////////////////////////////////////////////////
//
//          YouTube player
//
///////////////////////////////////////////////////

// Load iframe player code...
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// ... and create the iframe once loaded
var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: 'wGkvyN6s9cY',
        events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
        }
    });
}

// Called when ready to play

function onPlayerReady(event) {
    event.target.playVideo();
}

// Called on state change

var done = false;
function onPlayerStateChange(event) {
    // Ensure player.duration is always available by playing for 5ms.
    if (event.data == YT.PlayerState.PLAYING && !done) {
        console.log("Pausing.");
        setTimeout(pauseVideo, 5);
        done = true;
    }
}

// Method to pause video

function pauseVideo() {
    player.pauseVideo();
}

///////////////////////////////////////////////////////////////////////////////
//
//          Web interface to backend
//
///////////////////////////////////////////////////

// global variables

var requestURL = "./" // Root URL for backend RQs
var depScrub = {}; // Holds slave scrubber instances and references to their TLs
var scrub; // holds master scrubber and reference to timeline
var oldElapsed; // Check to see if video has moved when scrubbing is needed.
var faces = []; // list of timelines that are exempt from search-in-all

///////////////////////////////////////////////////
//
//          Communication with backend
//
///////////////////////////////////////////////////

function checkStatus() {
    // Should be called every few seconds. Queries backend for states of 
    // data mining if they're not flagged as READY, ERROR or WAIT.

    for (var v in depScrub) {
            if (depScrub[v].status == "WAIT") {
                console.log("Checking status for " + v);
                doGet('status/' + v, updateStatus, v);
            }
    }
}

function updateStatus(status, tlIndex) {
    // Updates a given depScrub's status to match the backend
 
    if (!timeline in depScrub) return;

    depScrub[tlIndex].status = status;

    if (status == 'READY') {
        depScrub[tlIndex].tl.style.backgroundImage = 'none';
        if (tlIndex == 'facerecog') doGet('getfaces/facerecog', updateFaces);
    }
    if (status == 'WAIT') {
        depScrub[tlIndex].tl.style.backgroundImage = "url('./loading.gif')";
    }
    if ((status == 'ERROR') || (status == null)) {
        depScrub[tlIndex].tl.style.backgroundImage = "url('./error.gif')";
    }
    console.log("Timeline " + tlIndex + " status set to " + depScrub[tlIndex].status);
}

function doGet(url, callback, arg=null) {
    // Takes a url and a callback, submits an async GET to the URL and
    // passes the results to the callback method
    // Arg may be provided to pass extra data of any type.

    url = requestURL + url;
    console.log("Making request: " + url);
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            var result = JSON.parse(xmlHttp.responseText);
            if (arg) callback(result, arg);
            else callback(result);
        } else if (xmlHttp.readyState == 4 && xmlHttp.status != 200) {
            if (arg) callback(null, arg);
            else callback(null);
        }
    }

    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);
}

function doPost(url, params, callback, arg=null) {
    // Takes a url and a callback, submits an async POST to the URL and
    // passes the results to the callback method
    // Arg may be provided to pass extra data of any type.

    url = requestURL + url;

    console.log("Making request: " + url);
    
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.open("POST", url, true);
    xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xmlHttp.onreadystatechange = function() { //Call a function when the state changes.
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            var result = JSON.parse(xmlHttp.responseText);
            if (arg) callback(result, arg);
            else callback(result);
        } else if (xmlHttp.readyState == 4 && xmlHttp.status != 200) {
            if (arg) callback(null, arg);
            else callback(null);
        }
    }
    xmlHttp.send(params);
}

function getTimelineTypes() {
    // Async request for timeline population

    doGet('getTimelines/', setTimelineTypes);
}

function setTimelineTypes(timelines) {
    // Populate timeline selection based on timelines available in backend

    if (timelines == null) {
        console.log("Unable to load timelines.");
        return
    }
    
    console.log("Got timelines from server.");

    // note timelines that are special-cased
    faces = timelines[1];

    // Add timelines
    types = document.getElementById('types');

    for (var tl in timelines[0]) {
        newOption = document.createElement('option');
        newOption.setAttribute('value', tl);
        newOption.innerText = timelines[0][tl];
        types.appendChild(newOption);
    }
}

function searchTimeline(tl, params, colour = "") {
    // Search a given timeline

    if (depScrub[tl].status != "READY") return;

    console.log("Searching " + tl + ": " + params);
    if (colour == "") doPost('search/' + tl, params, addResults, [tl]);
    else doPost('search/' + tl, params, addResults, [tl, colour])
}

function searchOne(tl, clear=true) {
    // Handler for single-timeline searches
    var params = 'searchterms=' + document.getElementById('searchterms').value;

    if (clear) clearResults(tl);
    searchTimeline(tl, params, "#4455DD");
}

function searchAll(clear=true) {
    // Handler for searching all timelines
    var params = 'searchterms=' + document.getElementById('searchterms').value;

    for (tl in depScrub) {
        if (depScrub[tl].status != "READY") continue;
        if (faces.includes(tl)) continue;

        if (clear) clearResults(tl);
        searchTimeline(tl, params);
    }
}

function updateFaces(faceData) {
    if (faceData == null) {
        console.log("Unable to acquire face data.");
        return;
    }

    form = document.getElementById('faceForm');

    for (var i = 0; i < faceData.length; i++) {
        var checkBox = document.createElement("INPUT");
        checkBox.setAttribute("type", "checkbox");
        checkBox.setAttribute("value", i);
        checkBox.onclick = searchFaces;
        
        var span = document.createElement("span");
        span.setAttribute("class", "faceform")
        span.appendChild(checkBox);

        for (var j = 0; j < faceData[i]; j++) {
            var img = document.createElement("IMG");
            img.setAttribute("width", "50");
            img.setAttribute("height", "50");
            img.setAttribute("src", "./faces/" + i + "_" + j + ".png");

            span.appendChild(img);
        }
        form.appendChild(span);
    }

}

function searchFaces() {
    // Special-cased search for face recognition timeline

    var tl = 'facerecog';

    var selection = document.getElementById('faceForm');
    var terms = "searchterms=";

    for (var i = 0; i < selection.children.length; i++) {
        var span = selection.children[i];
        for (var j = 0; j < span.children.length; j++) {
            if (span.children[j].checked == true)
                terms += span.children[j].value + " ";
        }
    }
 
    clearResults(tl);
    if (terms != "searchterms=") searchTimeline(tl, terms);
}










///////////////////////////////////////////////////
//
// Functions dealing with dependent scrubbers
//
///////////////////////////////////////////////////

function registerDepScrubber(scrubber, timeline, name) {
    // Adds a new dependent scrubber to depScrub

    // A dependent scrubber holds a reference to its scrubber (el), a reference to its
    // timeline (tl) and the current x position of the scrubber relative to the timeline

    newDepScrub = {
        el: scrubber,
        tl: timeline,
        current: {
            x: 0
        },
            last: {
            x: 0
        },
        status: ''
    };

    depScrub[name] = newDepScrub;
    updateStatus('WAIT', name);
    console.log("Registered new scrubber, '" + name + "'");
}

function setScrubPosition(current, percent) {
    // Called to set the percentage position of a dependent scrubber relative to its timeline.

    // clamp within percentage range
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    var scrubStyle  = getComputedStyle(current.el),
        timeStyle   = getComputedStyle(current.tl, 10),
        timeWidth   = parseInt(timeStyle.width,10), // Timeline width
        scrubOffset = (parseInt(scrubStyle.width,10) / timeWidth * 100) / 2; // width of scrubber in % of timeline width, halved

    var newPosition = percent - scrubOffset;

    current.el.style.left = newPosition + "%";
}

function addNewTimeline() {
    // Add a new timeline to the page and register it with depScrubbers

    // Get the internal name of the timeline we're adding...
    var dropDown = document.getElementById('types');
    var timelineValue = dropDown.value;

    // Check it doesn't already exist
    if (
        ((timelineValue in depScrub) && (depScrub[timelineValue] != undefined)) ||
        (timelineValue == "default")
    ) return;

    var timelineName = "";

    dropDown.childNodes.forEach( // Disable a given timeline option once added.
        function(current) {
            if (current.value == timelineValue) {
                current.setAttribute('disabled', 'true');
                timelineName = current.innerHTML;
            }
        }
    )

    // Create the new divs that make up a timeline
    var timelines = document.getElementById('timelines'),   // for parent setting
        frame = document.createElement("DIV"),              // Create frame
        newTimeline = document.createElement("DIV"),        // Create actual timeline
        scrubber = document.createElement("DIV");           // Create scrubber for tl

    var html = "";

    if (!faces.includes(timelineValue)) { // most timelines

        // Add links with calls to searchOne(), clearResults(), regenTimeline(), removeTimeline()
        html = timelineName + 
            " [<a class='title' href='javascript: searchOne(\"" + timelineValue + "\", false)'>Add results to this timeline</a>]" +
            " [<a class='title' href='javascript: clearResults(\"" + timelineValue + "\")'>Clear results from this timeline</a>]" +
            " [<a class='title' href='javascript: regenTimeline(\"" + timelineValue + "\")'>Re-generate this timeline</a>]" +
            " [<a class='title' href='javascript: removeTimeline(\"" + timelineValue + "\")'>Remove this timeline</a>]";

        

    } else {
        if (timelineValue == 'facerecog') { // special-cased face timeline
            html = timelineName + 
                " [<a class='title' href='javascript: regenTimeline(\"" + timelineValue + "\")'>Re-generate this timeline</a>]" +
                " [<a class='title' href='javascript: removeTimeline(\"" + timelineValue + "\")'>Remove this timeline</a>]";
            
            // append checkboxes
            html += "<br>\n<div><form id='faceForm'></form></div>"
        }
    }

    frame.innerHTML = html;

    frame.setAttribute('class', 'timelineFrame');
    scrubber.setAttribute('class', 'dependentScrubber');
    newTimeline.setAttribute('class', 'dependentTimeline');

    newTimeline.appendChild(scrubber);
    frame.appendChild(newTimeline);

    timelines.appendChild(frame);

    // Store handles to the new scrubber
    registerDepScrubber(scrubber, newTimeline, timelineValue);

    // trigger backend data processing
    doGet('add/' + timelineValue, null);
}

function removeTimeline(timeline) {
    // Removes a given timeline from the interface

    if (!timeline in depScrub) return;

    // Get the timeline's frame and delete all of its children, then remove the frame from
    // its parent

    tl = depScrub[timeline].tl.parentNode;

    while (tl.firstChild) {
        tl.removeChild(tl.firstChild);
    }

    tl.parentNode.removeChild(tl);

    // Done with the depScrub
    delete depScrub[timeline];
    console.log("Unregistered timeline " + timeline);

    // re-enable menu option

    var dropDown = document.getElementById('types');

    dropDown.childNodes.forEach( // Disable a given timeline option once added.
        function(current) {
            if (current.value == timeline) current.removeAttribute('disabled');
        }
    )

}

function regenTimeline(tl) {
    clearResults(tl);
    updateStatus('WAIT', tl);
    doGet('regen/' + tl, null);
}

function addResults(results, args) {
    // Add each returned result to the timeline specified

    var timeline = args[0];

    if (!timeline in depScrub) return;
    
    if (results == null) {
        console.log("No results found.");
        return;
    }

    console.log("Adding " + results.length + " results to " + timeline);

    for (var result in results) {
        if (args.length > 1) addResultToTimeline(timeline, results[result].start, results[result].end, args[1]);
        else addResultToTimeline(timeline, results[result].start, results[result].end);
    }
    
}

function addResultToTimeline(tl, start, end, colour = "#FFDD00", tag = "") {
    // Adds a given result to a given timeline, with optional tag and colour

    if (!timeline in depScrub) return;

    var timeline = depScrub[tl].tl;

    timeStyle   = getComputedStyle(timeline, 10),
    timeWidth   = parseInt(timeStyle.width,10);
    duration    = player.getDuration();

    width = end - start;

    start = start / duration * 100;
    width = width / duration * 100;

    result = document.createElement("SPAN");
    result.setAttribute('class', 'highlightField');
    result.setAttribute('title', tag);

    result.setAttribute('style', 'left: ' + start + '%; width: ' + width + '%; background-color: ' + colour)
    timeline.appendChild(result);
}

function clearResults(tl) {
    // Removes all search results from the given timeline 

    if (!tl in depScrub) return;

    var timeline = depScrub[tl].tl;
    var results = timeline.children;
    var x = 0;

    while (results[1]) {
        timeline.removeChild(results[1]);
    }
}

///////////////////////////////////////////////////
//
//          Functions interfacing w/ player
//
///////////////////////////////////////////////////

function loadNewVideo() {
    // Loads a new video into the player and notify the backend

    var url = document.getElementById("uri").value;

    // notify backend
    doPost('setURL', "uri=" + encodeURI(url), function(result) {console.log(result);});

    // clear timelines
    for (var key in depScrub) {
        clearResults(key);
        removeTimeline(key);
    }

    var id = url.split("v=")[1].split("&")[0]; // Everything between =v...&
    url = "http://www.youtube.com/v/" + id;
    url += "?version=3";
    player.cueVideoByUrl(url);

    done = false;
    player.playVideo();
}

function scrubToVideo(percentage, allowSeekAhead = true) {
    // scrub video to given % of playback - this should trigger scrubFromVideo on other scrubbers

    var duration = player.getDuration();
    player.seekTo(duration / 100 * percentage, allowSeekAhead);
}

function scrubFromVideo() {
    // update position of scrub bar as % of video traversed

    var elapsed = player.getCurrentTime(), duration = player.getDuration();

    if (elapsed == oldElapsed) return;
    oldElapsed = elapsed;

    var playedPercent = elapsed/duration * 100;

    if (!scrub.mouseDown) setScrubPosition(scrub, playedPercent);

    for (var key in depScrub) {
        setScrubPosition(depScrub[key], playedPercent);
    }
}
















///////////////////////////////////////////////////
//
//          Setup and event handlers
//
///////////////////////////////////////////////////

window.onload = function() {
    getTimelineTypes();

    scrub = {
        el: document.getElementById("scrubber"),
        tl: document.getElementById("timeline"),
        current: {
        x: 0
        },
        last: {
        x: 0
        }
    };

    scrub.el.onmousedown = function () {
        scrub.mouseDown = true;
        scrub.origin = scrub.tl.offsetLeft;
        scrub.last.x = scrub.el.offsetLeft;
        return false;
    };

    scrub.tl.onclick = function (e) {
        return
        // We want to find the position of the click and then turn it into a % offset
        percentage = 0; // method goes here

    }

    window.setInterval(function(){scrubFromVideo();}, 100)
    window.setInterval(checkStatus, 5000);
}

document.onmousemove = function(e) {          
if ((scrub) && (scrub.mouseDown === true)) {
    var scrubStyle  = getComputedStyle(scrub.el),
        scrubOffset = parseInt(scrubStyle.width,10)/2,
        position    = parseInt(scrubStyle.left, 10),
        newPosition = position + (e.clientX - scrub.last.x),
        timeStyle   = getComputedStyle(timeline, 10),
        timeWidth   = parseInt(timeStyle.width,10);
    oldPosition = scrub.last.x;
    newPosition = e.movementX;
    newPosition = (oldPosition + newPosition) / timeWidth * 100;

    setScrubPosition(scrub, newPosition);
    scrubToVideo(newPosition);

    scrub.last.x = scrub.last.x + e.movementX;
    }
};


      






document.onmouseup = function() {
    if (scrub.mouseDown) {
        scrub.mouseDown = false;
    }
};




