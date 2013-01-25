function package(nspace)
{
    var nspaceComponents = nspace.split(".");
    var parent = window;
    for (var i = 0; i < nspaceComponents.length; ++i) {
        if (typeof parent[nspaceComponents[i]] === "undefined") {
            parent[nspaceComponents[i]] = {};
        }
        parent = parent[nspaceComponents[i]];
    }
}

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
};