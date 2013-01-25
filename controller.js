package("org.controller");

const CONTRIBUTORS_JSON = "contributors.json";
const TRAC_URL = "http://trac.webkit.org/search?changeset=on&q={0}+show_bug.cgi%3Fid%3D&page={1}&noquickjump=1";
const BUGZILLA_URL = "https://bugs.webkit.org/show_bug.cgi?ctype=xml&excludefield=attachmentdata&{0}";

org.controller.Controller = function(model)
{
    this._model = model;
    this._networkManager = new org.net.NetworkManager();
    this._events = {};
}

org.controller.Events = {
    ContributorsReceived: "ContributorsReceived",
    TracDataReceived: "TracDataReceived",
    BugzillaDataReceived: "BugzillaDataReceived"
}

org.controller.Controller.prototype = {
    requestContributors: function() 
    {
        this._networkManager.request(CONTRIBUTORS_JSON, this._onContributorsReceived.bind(this));
    },

    _onContributorsReceived: function(contributorsJSON)
    {
        var jsonContributors = JSON.parse(contributorsJSON).contributors;
        var contributors = [];

        for (var i = 0; i < jsonContributors.length; ++i)
            contributors.push(new org.model.Contributor(this, jsonContributors[i]));

        this.dispatchEventToListeners(org.controller.Events.ContributorsReceived, contributors);
    },

    requestTracDataFor: function(contributors)
    {
        this.contributors = contributors;
        this.pendingRequests = contributors.length;
        for (var i = 0; i < contributors.length; ++i)
            this.requestTracData(contributors[i]);
    },

    requestTracData: function(contributor)
    {
        if (!contributor.currentPage) 
            contributor.currentPage = 1;

        this._networkManager.request(TRAC_URL.format(contributor.shortname, contributor.currentPage), this._onTracDataReceived.bind(this));
    },

    _onTracDataReceived: function(tracData)
    {
        //TODO: The document fragment should be removed with the usage
        //of string and regular expressions.
        var df = document.createDocumentFragment();
        var div = document.createElement("div");
        div.innerHTML = tracData;
        df.appendChild(div);

        var name = df.querySelector("#q").value.split(" ")[0];
        var startIndex = parseInt(df.querySelector("meta[name=startIndex]").content);
        var totalCount = parseInt(df.querySelector("meta[name=totalResults]").content);
        var itemsPerPage = parseInt(df.querySelector("meta[name=itemsPerPage]").content);

        for (var i = 0; i < this.contributors.length; ++i) {
            var contributor = this.contributors[i];
            if (contributor.shortname === name) {                
                contributor.tracData += tracData;
                if ((startIndex + itemsPerPage) <= totalCount) {
                    contributor.currentPage++;
                    this.requestTracData(contributor);
                } else {
                    this._parseBugIds(contributor, totalCount);
                }
            }
        }
    },

    _parseBugIds: function(contributor, totalCount)
    {
        var df = document.createDocumentFragment();
        var div = document.createElement("div");
        div.innerHTML = contributor.tracData;
        df.appendChild(div);

        const bugString = "show_bug.cgi?id=";

        var bugs = df.querySelectorAll("dd.searchable");
        var bugIds = [];
        for (var b = 0; b < bugs.length; ++b) {
            var start = bugs[b].innerText.indexOf(bugString);
            var index = start + bugString.length;
            var textData = bugs[b].textContent.replace(/\n/g,' ');
            var c = textData.charAt(index);
            var bugId = "";
            while(c !== ' ') {
                bugId += c;
                c = textData.charAt(++index);
            }
            bugIds.push(bugId);            
        }

        contributor.totalCount = totalCount;
        contributor.bugIds = bugIds;
        delete contributor.tracData;
        delete contributor.currentPage;

        this.pendingRequests--;

        if (this.pendingRequests == 0) {
            this.dispatchEventToListeners(org.controller.Events.TracDataReceived, this.contributors);
            delete this.pendingRequests;
        }
    },

    requestBugzillaDataFor: function(contributors) 
    {
        for (var i = 0; i < contributors.length; ++i) {
            var bugUrl = "id=" + contributors[i].bugIds.join("&id=");
            this._networkManager.request(BUGZILLA_URL.format(bugUrl), this._onBugzillaDataReceived.bind(this));
        }
    },

    _onBugzillaDataReceived: function(xml)
    {
        this.dispatchEventToListeners(org.controller.Events.BugzillaDataReceived, xml);
    },

    addEventListener: function(eventName, callback) {
        if (!this._events[eventName]) {
            this._events[eventName] = {};
            this._events[eventName].name = eventName;
            this._events[eventName].callbacks = [];
        }

        this._events[eventName].callbacks.push(callback);
    },

    dispatchEventToListeners: function(eventName, data) {
        var event = this._events[eventName];
        if (!event)
            return;
        
        var eventData = {}
        eventData.name = eventName;
        eventData.data = data;

        for (var i = 0, l = event.callbacks.length; i < l; ++i) {
            var f = function(eventData) { this(eventData); }
            setTimeout(f.bind(event.callbacks[i], eventData), 0);
        }
    },

}
