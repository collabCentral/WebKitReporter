package("org.net");

NetworkRequest = function(url, callback)
{
    this.url = url;
    this.callback = callback;
}

org.net.NetworkManager = function()
{
    this._requestQueue = [];
    this._busy = false;
    this._currentRequest = null;
    this._cacheManager = new org.net.CacheManager();
    this._cacheManager.addEventListener(org.net.CacheManager.Events.CachedResponse, this._onResponse.bind(this));
}

org.net.NetworkManager.Priority = {
    High: 0,
    Normal: 1
}

org.net.NetworkManager.prototype = {
    _processRequest: function()
    {
        if (this._busy || this._requestQueue.length === 0)
            return;

        this._busy = true;
        this._currentRequest = this._requestQueue.splice(0, 1)[0];
        this._cacheManager.request(this._currentRequest.url);
    },

    _onResponse: function(event)
    {
        this._busy = false;
        this._currentRequest.callback(event.data);
        setTimeout(this._processRequest.bind(this), 0);
    },

    request: function(url, callback, priority)
    {
        if (typeof priority === "undefined")
            priority = org.net.NetworkManager.Priority.Normal;

        if (priority === org.net.NetworkManager.Priority.High)
            this._requestQueue.unshift(new NetworkRequest(url, callback));
        else
            this._requestQueue.push(new NetworkRequest(url, callback));

        setTimeout(this._processRequest.bind(this), 0);
    }
}

org.net.CacheManager = function()
{
    org.base.Notifier.call(this);
    this._xhr = new XMLHttpRequest();
}

org.net.CacheManager.Events = {
    CachedResponse: "CachedResponse"
}

org.net.CacheManager.prototype = {
    __proto__: org.base.Notifier.prototype,

    request: function(url)
    {
        var cachedResponse = (url.search("xsl") !== -1 || url.search("json") !== -1) ? null : localStorage.getItem(url);
        if (!cachedResponse) {
            this._xhr.onreadystatechange = this._onXHRResponse.bind(this);
            this._xhr.url = url;
            this._xhr.open("GET", url, true);
            this._xhr.send();
        } else {
            function fireEvent()
            {
                this.dispatchEventToListeners(org.net.CacheManager.Events.CachedResponse, cachedResponse);
            }
            setTimeout(fireEvent.bind(this), 0);
        }
    },

    _onXHRResponse: function()
    {
        if (this._xhr.readyState === 4 && this._xhr.status == 200) {
            localStorage.setItem(this._xhr.url, this._xhr.responseText);
            this.dispatchEventToListeners(org.net.CacheManager.Events.CachedResponse, this._xhr.responseText);
        }
    }
}
