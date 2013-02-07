package("org.base");

org.base.Notifier = function()
{
}

org.base.Notifier.prototype = {
    addEventListener: function(eventName, callback) {
        if (!this._events)
            this._events = {};

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
    }
}
