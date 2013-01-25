package("org.model");

org.model.ModelClass = function()
{
    this.controller = new org.controller.Controller(this);
    this.controller.addEventListener(org.controller.Events.ContributorsReceived, this._onContributorsReceived.bind(this));
    this.controller.addEventListener(org.controller.Events.TracDataReceived, this._onTracDataReceived.bind(this));
    this.controller.addEventListener(org.controller.Events.BugzillaDataReceived, this._onBugzillaDataReceived.bind(this));
    this.controller.requestContributors();
}

org.model.ModelClass.prototype = {
    _onContributorsReceived: function(event)
    {
        this.controller.requestTracDataFor(event.data);
    },

    _onTracDataReceived: function(event)
    {
        this.controller.requestBugzillaDataFor(event.data);
    },

    _onBugzillaDataReceived: function(event)
    {
        if (!this.me)
            document.documentElement.innerHTML = event.data;
        else
            document.documentElement.innerHTML += event.data;
    }
}

org.model.Contributor = function(controller, jsonObject)
{
    this.controller = controller;

    for (var property in jsonObject)
        this[property] = jsonObject[property];
}

org.model.Contributor.prototype = {

}

function init()
{
    org.model.Model = new org.model.ModelClass();
}
