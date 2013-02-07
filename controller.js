package("org.controller");

const CONTRIBUTORS_JSON = "contributors.json";
const BUG_TRANSFORMER_XSL = "bugTransformer.xsl";
const TRAC_URL = "http://trac.webkit.org/search?changeset=on&q={0}+show_bug.cgi%3Fid%3D&page={1}&noquickjump=1";
const BUGZILLA_URL = "https://bugs.webkit.org/show_bug.cgi?ctype=xml&excludefield=attachmentdata&{0}";

org.controller.Controller = function(model)
{
    org.base.Notifier.call(this);
    this._model = model;
    this._networkManager = new org.net.NetworkManager();
}

org.controller.Events = {
    ContributorsReceived: "ContributorsReceived",
    TracDataReceived: "TracDataReceived",
    BugzillaDataReceived: "BugzillaDataReceived",
    BugDataTransformed: "BugDataTransformed"
}

org.controller.Controller.prototype = {
    __proto__: org.base.Notifier.prototype,

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
            var textData = bugs[b].innerHTML.replace(/\n/g,' ');
            var start = textData.indexOf(bugString);
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
            var contributor = contributors[i];
            this._networkManager.request(BUGZILLA_URL.format(bugUrl), this._onBugzillaDataReceived.bind(this, contributor));
        }
    },

    _onBugzillaDataReceived: function(contributor, xml)
    {
        xml = xml.replace(/(\r\n|\n|\r)/g,"");
        xml = xml.replace(/<bugzilla/g, "<bugzilla contributor=\"" + contributor.name + "\"");
        this.dispatchEventToListeners(org.controller.Events.BugzillaDataReceived, xml);
    },
    
    transformBugData: function(xml)
    {
        if (!this._xsl)
            this._networkManager.request(BUG_TRANSFORMER_XSL, this._onXslReceived.bind(this, xml), org.net.NetworkManager.Priority.High);
        else
            this._onXslReceived(xml, this._xsl);
    },
     
    _onXslReceived: function(xml, xslSheet)
    {
        this._xsl = xslSheet;
        var proc = new XSLTProcessor();
        xslDoc = new DOMParser().parseFromString(xslSheet, "text/xml");
        proc.importStylesheet(xslDoc);

        xmlDom = new DOMParser().parseFromString(xml, "text/xml");
        var xslt = proc.transformToFragment(xmlDom, document);
        this.dispatchEventToListeners(org.controller.Events.BugDataTransformed, xslt);
    }
}
