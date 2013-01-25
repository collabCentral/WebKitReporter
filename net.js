package("org.net");

NetworkRequest = function(url, callback)
{
    this.url = url;
    this.callback = callback;
}

org.net.NetworkManager = function()
{
    this._xhr = new XMLHttpRequest();
    this._requestQueue = [];
    this._busy = false;
    this._currentRequest = null;
}

org.net.NetworkManager.prototype = {
    _processRequest: function()
    {
        if (this._busy || this._requestQueue.length === 0)
            return;

        this._busy = true;
        this._currentRequest = this._requestQueue.splice(0, 1)[0];
        this._xhr.onreadystatechange = this._onResponse.bind(this);
        this._xhr.open("GET", this._currentRequest.url, true);
        this._xhr.send();
    },

    _onResponse: function()
    {
        if (this._xhr.readyState === 4 && this._xhr.status == 200) {
            this._busy = false;
            this._currentRequest.callback(this._xhr.responseText);
            setTimeout(this._processRequest.bind(this), 0);
        }
    },

    request: function(url, callback) 
    {
        this._requestQueue.push(new NetworkRequest(url, callback));
        this._processRequest();
    }
}
