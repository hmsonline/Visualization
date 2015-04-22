
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Audio.js',["../common/HTMLWidget"], factory);
    } else {
        root.other_Audio = factory(root.common_HTMLWidget);
    }
}(this, function (HTMLWidget) {
    function Audio() {
        HTMLWidget.call(this);
        this._class = "other_Audio";

        this._tag = "audio";

        this._source = [];
        this._sections = {};
    };
    Audio.prototype = Object.create(HTMLWidget.prototype);

    Audio.prototype.source = function (_) {
        if (!arguments.length) return this._source;
        this._source = _;
        return this;
    };

    Audio.prototype.section = function (label, offset, beatLength, beatCount) {
        if (!arguments.length) return this._sections;
        if (arguments.length === 1) return this._sections[label];
        this._sections[label] = {
            label: label,
            offset: offset,
            beatLength: beatLength,
            beatCount: beatCount,
            endOffset: offset + beatCount * beatLength
        };
        return this;
    };

    Audio.prototype.getType = function (fileExt) {
        switch(fileExt) {
            case "mp3":
                return "audio/mpeg; codecs='mp3'";
            case "ogg":
                return "audio/ogg; codecs='vorbis'";
        }
        return "";
    };


    Audio.prototype.enter = function (domNode, element) {
        var context = this;
        element.on("play", function (d) { context.onPlay(d); })
    };

    Audio.prototype.update = function (domNode, element) {
        var context = this;

        var source = element.selectAll("source").data(this._source, function (d) { return d; });
        source.enter().append("source")
            .attr("src", function (d) { return d; })
        ;
    }

    Audio.prototype.createTimer = function (params, startTime, beat) {
        var context = this;
        d3.timer(function () {
            context.onTick(params.label, beat, params);
            return true;
        }, beat * params.beatLength, startTime + params.offset);
    };

    Audio.prototype.onTick = function (label, beat, params) {
    };

    Audio.prototype.onPlay = function (d) {
        var startTime = Date.now();
        for (var key in this._sections) {
            var section = this._sections[key];
            for (var i = 0; i < section.beatCount; ++i) {
                this.createTimer(section, startTime, i);
            }
        }
    };

    Audio.prototype.play = function (d) {
        var context = this;
        this._element.on("canplaythrough", function (d) {
            context.node().play();
        })
        this.node().load();
    };

    return Audio;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Bag.js',[], factory);
    } else {
        root.other_Bag = factory();
    }
}(this, function () {
    function SelectionBag() {
        this.items = {};
    };

    SelectionBag.prototype = {
        clear: function () {
            for (var key in this.items) {
                this.items[key].element().classed("selected", false);
            }
            this.items = {};
        },
        isEmpty: function() {
            for (var key in this.items) {
                return false;
            }
            return true;
        },
        append: function (item) {
            this.items[item._id] = item;
            item.element().classed("selected", true);
        },
        remove: function (item) {
            this.items[item._id].element().classed("selected", false);
            delete this.items[item._id];
        },
        isSelected: function(item) {
            return this.items[item._id];
        },
        get: function () {
            var retVal = [];
            for (var key in this.items) {
                retVal.push(this.items[key]);
            }
            return retVal;
        },
        set: function (itemArray) {
            this.clear();
            itemArray.forEach(function (item, idx) {
                this.append(item);
            }, this);
        },
        click: function (item, d3Event) {
            if (d3Event.ctrlKey) {
                if (this.items[item._id]) {
                    this.remove(item);
                } else {
                    this.append(item);
                }
            } else {
                this.clear();
                this.append(item);
            }
        }
    };

    return {
        Selection: SelectionBag,
        Navigation: null
    };
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Comms.js',[], factory);
    } else {
        root.other_ESPUrl = factory();
    }
}(this, function () {
    function ESPUrl() {
        this._protocol = "http:";
        this._hostname = "localhost";
    };

    ESPUrl.prototype.url = function (_) {
        if (!arguments.length) return this._url;
        this._url = _;
        var parser = document.createElement('a');
        parser.href = this._url;

        var params = {};
        if (parser.search.length) {
            var tmp = parser.search;
            if (tmp[0] === "?") {
                tmp = tmp.substring(1);
            }
            tmp = tmp.split("&");
            tmp.map(function (item) {
                var tmpItem = item.split("=");
                params[decodeURIComponent(tmpItem[0])] = decodeURIComponent(tmpItem[1]);
            });
        }
        this._protocol = parser.protocol;
        this._hostname = parser.hostname;
        this._port = parser.port;
        this._pathname = parser.pathname;
        while (this._pathname.length && this._pathname[0] === "/") {
            this._pathname = this._pathname.substring(1);
        }
        this._search = parser.search;
        this._params = params;
        this._hash = parser.hash;
        this._host = parser.host;

        return this;
    };

    ESPUrl.prototype.protocol = function (_) {
        if (!arguments.length) return this._protocol;
        this._protocol = _;
        return this;
    };

    ESPUrl.prototype.hostname = function (_) {
        if (!arguments.length) return this._hostname;
        this._hostname = _;
        return this;
    };

    ESPUrl.prototype.port = function (_) {
        if (!arguments.length) return this._port;
        this._port = _;
        return this;
    };

    ESPUrl.prototype.pathname = function (_) {
        if (!arguments.length) return this._pathname;
        this._pathname = _;
        return this;
    };

    ESPUrl.prototype.isWsWorkunits = function () {
        return this._pathname.toLowerCase().indexOf("wsworkunits") >= 0 || this._params["Wuid"];
    };

    ESPUrl.prototype.isWorkunitResult = function () {
        return this.isWsWorkunits() && (this._params["Sequence"] || this._params["ResultName"]);
    };

    ESPUrl.prototype.isWsEcl = function () {
        return this._pathname.toLowerCase().indexOf("wsecl") >= 0 || (this._params["QuerySetId"] && this._params["Id"]);
    };

    ESPUrl.prototype.isWsWorkunits_GetStats = function () {
        return this._pathname.toLowerCase().indexOf("wsworkunits/wugetstats") >= 0 && this._params["WUID"];
    };

    ESPUrl.prototype.getUrl = function (overrides) {
        overrides = overrides || {};
        return (overrides.protocol ? overrides.protocol : this._protocol) + "//" +
                (overrides.hostname ? overrides.hostname : this._hostname) + ":" +
                (overrides.port ? overrides.port : this._port) + "/" +
                (overrides.pathname ? overrides.pathname : this._pathname);
    };

    function ESPMappings(mappings) {
        this._mappings = mappings;
        this._reverseMappings = {};
        for (var resultName in this._mappings) {
            this._reverseMappings[resultName] = {};
            for (var key in this._mappings[resultName]) {
                this._reverseMappings[resultName][this._mappings[resultName][key]] = key;
            }
        }
    };

    ESPMappings.prototype.contains = function (resultName, origField) {
        return exists(resultName + "." + origField, this._mappings);
    };

    ESPMappings.prototype.mapResult = function (response, resultName) {
        var mapping = this._mappings[resultName];
        if (mapping) {
            response[resultName] = response[resultName].map(function (item) {
                var row = [];
                if (mapping.x && mapping.x instanceof Array) {
                    //  LINE Mapping  ---
                    row = [];
                    for (var i = 0; i < mapping.x.length; ++i) {
                        row.push(item[mapping.y[i]]);
                    }
                } else {
                    //  Regular Mapping  ---
                    for (var key in mapping) {
                        if (mapping[key] === "label") {
                            row[0] = item[key];
                        } else if (mapping[key] === "weight") {
                            row[1] = item[key];
                        }
                    }
                }
                return row;
            }, this);
        }
    };

    ESPMappings.prototype.mapResponse = function (response) {
        for (var key in response) {
            this.mapResult(response, key);
        }
    };

    function Comms() {
        ESPUrl.call(this);
        this._proxyMappings = {};
        this._mappings = new ESPMappings({});
    };
    Comms.prototype = Object.create(ESPUrl.prototype);

    var exists = function (prop, scope) {
        var propParts = prop.split(".");
        var testScope = scope;
        for (var i = 0; i < propParts.length; ++i) {
            var item = propParts[i];
            if (testScope[item] === undefined) {
                return false;
            }
            testScope = testScope[item];
        }
        return true;
    };

    var serialize = function (obj) {
        var str = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                str.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
            }
        }
        return str.join("&");
    };

    Comms.prototype.jsonp = function (url, request, callback) {
        for (var key in this._proxyMappings) {
            var newUrlParts = url.split(key);
            var newUrl = newUrlParts[0];
            if(newUrlParts.length > 1) {
                var espUrl = new ESPUrl()
                    .url(url)
                ;
                url = newUrl + this._proxyMappings[key];
                request.IP = espUrl._hostname;
                request.PORT = espUrl._port;
                if (newUrlParts.length > 0) {
                    request.PATH = newUrlParts[1];
                }
                break;
            }
        }
        var context = this;
        var callbackName = 'jsonp_callback_' + Math.round(Math.random() * 999999);
        window[callbackName] = function (response) {
            delete window[callbackName];
            document.body.removeChild(script);
            callback(response);
        };

        var script = document.createElement('script');
        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'jsonp=' + callbackName + "&" + serialize(request);
        document.body.appendChild(script);
    };

    Comms.prototype.mappings = function (_) {
        if (!arguments.length) return this._mappings;
        this._mappings = new ESPMappings(_);
        return this;
    };

    Comms.prototype.proxyMappings = function (_) {
        if (!arguments.length) return this._proxyMappings;
        this._proxyMappings = _;
        return this;
    };

    function WsECL() {
        Comms.call(this);

        this._port = "8002";
        this._target = "";
        this._query = "";
    };
    WsECL.prototype = Object.create(Comms.prototype);

    WsECL.prototype.url = function (_) {
        var retVal = Comms.prototype.url.apply(this, arguments);
        if (arguments.length) {
            //  http://192.168.1.201:8010/esp/files/stub.htm?QuerySetId=roxie&Id=stock.3&Widget=QuerySetDetailsWidget
            this._port = this._port === "8010" ? "8002" : this._port;  //  Need a better way  ---
            for (var key in this._params) {
                switch (key) {
                    case "QuerySetId":
                        this.target(this._params[key]);
                        break;
                    case "Id":
                        this.query(this._params[key]);
                        break;
                }
            }

            if (!this._target && !this._query) {
                // http://192.168.1.201:8002/WsEcl/res/query/hthor/quicktest/res/index.html
                var pathParts = this._pathname.split("/res/");
                if (pathParts.length >= 2) {
                    var queryParts = pathParts[1].split("/");
                    if (queryParts.length >= 3) {
                        this.target(queryParts[1]);
                        this.query(queryParts[2]);
                    }
                }
            }
        }
        return retVal;
    };

    WsECL.prototype.target = function (_) {
        if (!arguments.length) return this._target;
        this._target = _;
        return this;
    };

    WsECL.prototype.query = function (_) {
        if (!arguments.length) return this._query;
        this._query = _;
        return this;
    };

    WsECL.prototype.constructUrl = function () {
        return Comms.prototype.getUrl.call(this, {
            pathname: "WsEcl/submit/query/" + this._target + "/" + this._query + "/json"
        });
    };

    WsECL.prototype.call = function (target, request, callback) {
        target = target || {};
        target.target = target.target || this._target;
        target.query = target.query || this._query;
        var context = this;
        var url = this.getUrl({
            pathname: "WsEcl/submit/query/" + target.target + "/" + target.query + "/json"
        });
        this.jsonp(url, request, function (response) {
            // Remove "xxxResponse.Result"
            for (var key in response) {
                response = response[key].Results;
                break;
            }
            // Remove "response.result.Row"
            for (var key in response) {
                response[key] = response[key].Row;
            }
            context._mappings.mapResponse(response);
            callback(response);
        });
    };

    WsECL.prototype.send = function (request, callback) {
        this.call({target: this._target, query: this._query}, request, callback);
    };

    function WsWorkunits() {
        Comms.call(this);

        this._port = "8010";
        this._wuid = "";
        this._jobname = "";
        this._sequence = null;
        this._resultName = null;

        this._resultNameCache = {};
        this._resultNameCacheCount = 0;
    };
    WsWorkunits.prototype = Object.create(Comms.prototype);

    WsWorkunits.prototype.url = function (_) {
        var retVal = Comms.prototype.url.apply(this, arguments);
        if (arguments.length) {
            //  http:x.x.x.x:8010/WsWorkunit/WuResult?Wuid=xxx&ResultName=yyy
            for (var key in this._params) {
                switch (key) {
                    case "Wuid":
                        this.wuid(this._params[key]);
                        break;
                    case "ResultName":
                        this.resultName(this._params[key]);
                        break;
                    case "Sequence":
                        this.sequence(this._params[key]);
                        break;
                }
            }
            if (!this._wuid) {
                //  http://192.168.1.201:8010/WsWorkunits/res/W20140922-213329/c:/temp/index.html
                var urlParts = this._url.split("/res/");
                if (urlParts.length >= 2) {
                    var urlParts2 = urlParts[1].split("/");
                    this.wuid(urlParts2[0]);
                }
            }
        }
        return retVal;
    };

    WsWorkunits.prototype.wuid = function (_) {
        if (!arguments.length) return this._wuid;
        this._wuid = _;
        return this;
    };

    WsWorkunits.prototype.jobname = function (_) {
        if (!arguments.length) return this._jobname;
        this._jobname = _;
        return this;
    };

    WsWorkunits.prototype.sequence = function (_) {
        if (!arguments.length) return this._sequence;
        this._sequence = _;
        return this;
    };

    WsWorkunits.prototype.resultName = function (_) {
        if (!arguments.length) return this._resultName;
        this._resultName = _;
        return this;
    };

    WsWorkunits.prototype.appendParam = function (label, value, params) {
        if (value) {
            if (params) {
                params += "&"
            }
            return params + label + "=" + value;
        }
        return params;
    };

    WsWorkunits.prototype.constructUrl = function () {
        var url = Comms.prototype.getUrl.call(this, {
            pathname: "WsWorkunits/res/" + this._wuid + "/"
        });
        var params = "";
        params = this.appendParam("ResultName", this._resultName, params);
        return url + (params ? "?" + params : "");
    };

    WsWorkunits.prototype._fetchResult = function (target, callback, skipMapping) {
        target = target || {};
        target._start = target._start || 0;
        target._count = target._count || -1;
        var url = this.getUrl({
            pathname: "WsWorkunits/WUResult.json"
        });
        var request = {
            Wuid: target.wuid,
            ResultName: target.resultname,
            SuppressXmlSchema: true,
            Start: target._start,
            Count: target._count
        };
        this._resultNameCache[target.resultname] = {};
        var context = this;
        this.jsonp(url, request, function (response) {
            // Remove "xxxResponse.Result"
            for (var key in response) {
                if (!response[key].Result) {
                    throw "No result found.";
                }
                context._total = response[key].Total;
                response = response[key].Result;
                for (var key in response) {
                    response = response[key].Row;
                    break;
                }
                break;
            }
            context._resultNameCache[target.resultname] = response;
            if (!skipMapping) {
                context._mappings.mapResult(context._resultNameCache, target.resultname);
            }
            callback(context._resultNameCache[target.resultname]);
        });
    };

    WsWorkunits.prototype.fetchResult = function (target, callback, skipMapping) {
        if (target.wuid) {
            this._fetchResult(target, callback, skipMapping);
        } else if (target.jobname) {
            var context = this;
            this.WUQuery(target, function(response) {
                target.wuid = response[0].Wuid;
                context._fetchResult(target, callback, skipMapping);
            });
        }
    },

    WsWorkunits.prototype.WUQuery = function (request, callback) {
        var url = this.getUrl({
            pathname: "WsWorkunits/WUQuery.json",
        });
        var request = {
            Jobname: request.jobname,
            Count: 1
        }

        this._resultNameCache = {};
        this._resultNameCacheCount = 0;
        var context = this;
        this.jsonp(url, request, function (response) {
            if (!exists("WUQueryResponse.Workunits.ECLWorkunit", response)) {
                throw "No workunit found.";
            }
            response = response.WUQueryResponse.Workunits.ECLWorkunit;
            callback(response);
        });
    };

    WsWorkunits.prototype.fetchResultNames = function (callback) {
        var url = this.getUrl({
            pathname: "WsWorkunits/WUInfo.json",
        });
        var request = {
            Wuid: this._wuid,
            TruncateEclTo64k: true,
            IncludeExceptions: false,
            IncludeGraphs: false,
            IncludeSourceFiles: false,
            IncludeResults: true,
            IncludeResultsViewNames: false,
            IncludeVariables: false,
            IncludeTimers: false,
            IncludeResourceURLs: false,
            IncludeDebugValues: false,
            IncludeApplicationValues: false,
            IncludeWorkflows: false,
            IncludeXmlSchemas: false,
            SuppressResultSchemas: true
        }

        this._resultNameCache = {};
        this._resultNameCacheCount = 0;
        var context = this;
        this.jsonp(url, request, function (response) {
            if (exists("WUInfoResponse.Workunit.Results.ECLResult", response)) {
                response.WUInfoResponse.Workunit.Results.ECLResult.map(function (item) {
                    context._resultNameCache[item.Name] = [];
                    ++context._resultNameCacheCount;
                });
                callback(context._resultNameCache);
            }
        });
    };

    WsWorkunits.prototype.fetchResults = function (callback, skipMapping) {
        var context = this;
        this.fetchResultNames(function (response) {
            var toFetch = context._resultNameCacheCount;
            if (toFetch > 0) {
                for (var key in context._resultNameCache) {
                    var item = context._resultNameCache[key];
                    context.fetchResult({ wuid: context._wuid, resultname: key }, function (response) {
                        if (--toFetch <= 0) {
                            callback(context._resultNameCache);
                        }
                    }, skipMapping);
                };
            } else {
                callback(context._resultNameCache);
            }
        });
    };

    WsWorkunits.prototype.postFilter = function (request, response) {
        var retVal = {};
        for (var key in response) {
            retVal[key] = response[key].filter(function (row, idx) {
                for (var request_key in request) {
                    if (row[request_key] !== undefined && request[request_key] !== undefined && row[request_key] !== request[request_key]) {
                        return false;
                    }
                }
                return true;
            });
        }
        this._mappings.mapResponse(retVal);
        return retVal;
    };

    WsWorkunits.prototype.send = function (request, callback) {
        var context = this;
        if (!this._resultNameCacheCount) {
            this.fetchResults(function (response) {
                callback(context.postFilter(request, response));
            }, true);
        } else {
            callback(context.postFilter(request, this._resultNameCache));
        }
    };

    function WsWorkunits_GetStats() {
        Comms.call(this);

        this._port = "8010";
        this._wuid = null;
    };
    WsWorkunits_GetStats.prototype = Object.create(Comms.prototype);

    WsWorkunits_GetStats.prototype.url = function (_) {
        var retVal = Comms.prototype.url.apply(this, arguments);
        if (arguments.length) {
            //  http://192.168.1.201:8010/WsWorkunits/WUGetStats?WUID="xxx"
            for (var key in this._params) {
                switch (key) {
                    case "WUID":
                        this.wuid(this._params[key]);
                        break;
                }
            }
        }
        return retVal;
    };

    WsWorkunits_GetStats.prototype.wuid = function (_) {
        if (!arguments.length) return this._wuid;
        this._wuid = _;
        return this;
    };

    WsWorkunits_GetStats.prototype.constructUrl = function () {
        return Comms.prototype.getUrl.call(this, {
            pathname: "WsWorkunits/WUGetStats?WUID=" + this._wuid
        });
    };

    WsWorkunits_GetStats.prototype.send = function (request, callback) {
        var context = this;
        var url = this.getUrl({
            pathname: "WsWorkunits/WUGetStats.json?WUID=" + this._wuid
        });
        this.jsonp(url, request, function (response) {
            if (exists("WUGetStatsResponse.Statistics.WUStatisticItem", response)) {
                callback(response.WUGetStatsResponse.Statistics.WUStatisticItem);
            } else {
                callback([]);
            }
        });
    };

    //  HIPIERoxie  ---
    function HIPIERoxie() {
        Comms.call(this);
    };
    HIPIERoxie.prototype = Object.create(Comms.prototype);

    HIPIERoxie.prototype.fetchResults = function (request, callback) {
        var url = this.getUrl({});
        this._resultNameCache = {};
        this._resultNameCacheCount = 0;
        var context = this;
        this.jsonp(url, request, function (response) {
            // Remove "xxxResponse.Result"
            for (var key in response) {
                response = response[key].Results;
                break;
            }
            // Remove "response.result.Row"
            for (var key in response) {
                context._resultNameCache[key] = response[key].Row;
                ++context._resultNameCacheCount;
            }
            callback(context._resultNameCache);
        });
    };

    HIPIERoxie.prototype.fetchResult = function (name, callback) {
        callback(this._resultNameCache[name]);
    };

    HIPIERoxie.prototype.call = function (request, callback) {
        var context = this;
        this.fetchResults(request, callback);
    };

    //  HIPIEWorkunit  ---
    function HIPIEWorkunit() {
        WsWorkunits.call(this);

        this._hipieResults = {};
    };
    HIPIEWorkunit.prototype = Object.create(WsWorkunits.prototype);

    HIPIEWorkunit.prototype.hipieResults = function (_) {
        if (!arguments.length) return this._hipieResults;
        this._hipieResultsLength = 0;
        this._hipieResults = {};
        var context = this;
        _.forEach(function (item) {
            context._hipieResultsLength++;
            context._hipieResults[item.id] = item;
        });
        return this;
    };

    HIPIEWorkunit.prototype.fetchResults = function (callback) {
        var context = this;
        return WsWorkunits.prototype.fetchResultNames.call(this, function (response) {
            var toFetch = context._hipieResultsLength;
            if (toFetch > 0) {
                for (var key in context._hipieResults) {
                    var item = context._hipieResults[key];
                    context.fetchResult(item.from, function (response) {
                        if (--toFetch <= 0) {
                            callback(context._resultNameCache);
                        }
                    });
                };
            } else {
                callback(context._resultNameCache);
            }
        });
    };

    HIPIEWorkunit.prototype.fetchResult = function (name, callback) {
        var context = this;
        return WsWorkunits.prototype.fetchResult.call(this, { wuid: this._wuid, resultname: name }, function (response) {
            callback(response);
        });
    };

    HIPIEWorkunit.prototype.call = function (request, callback) {
        var context = this;
        if (request.refresh || !this._resultNameCache || !this._resultNameCacheCount) {
            this.fetchResults(callback);
        } else {
            var changedFilter = {};
            for (var key in request) {
                if (request[key] && request[key + "_changed"]) {
                    changedFilter[key] = request[key];
                }
            }
            var retVal = {};
            for (var key in this._hipieResults) {
                var item = this._hipieResults[key];
                var matchedResult = true;
                for (var key2 in changedFilter) {
                    if (item.filter.indexOf(key2) < 0) {
                        matchedResult = false;
                        break;
                    }
                }
                if (matchedResult) {
                    retVal[item.from] = this._resultNameCache[item.from].filter(function (row) {
                        for (var key2 in changedFilter) {
                            if (row[key2] !== changedFilter[key2]) {
                                return false;
                            }
                        }
                        return true;
                    });
                }
            }
            callback(retVal);
        }
    };

    //  HIPIEDatabomb  ---
    function HIPIEDatabomb() {
        HIPIEWorkunit.call(this);
    };
    HIPIEDatabomb.prototype = Object.create(HIPIEWorkunit.prototype);

    HIPIEDatabomb.prototype.databomb = function (_) {
        if (!arguments.length) return this._databomb;
        this._databomb = _;
        return this;
    };

    HIPIEDatabomb.prototype.fetchResults = function (callback) {
        var context = this;
        setTimeout(function () {
            context._resultNameCacheCount = 0;
            context._resultNameCache = context._databomb;
            for (var key in context._databomb) {
                context._resultNameCacheCount++;
            }
            callback(context._resultNameCache);
        }, 0);
    };

    return {
        ESPMappings: ESPMappings,
        ESPUrl: ESPUrl,
        WsECL: WsECL,
        WsWorkunits: WsWorkunits,
        HIPIERoxie: HIPIERoxie,
        HIPIEWorkunit: HIPIEWorkunit,
        HIPIEDatabomb: HIPIEDatabomb,
        createESPConnection: function (url) {
            url = url || document.URL;
            var testURL = new ESPUrl()
                .url(url)
            ;
            if (testURL.isWsWorkunits_GetStats()) {
                return new WsWorkunits_GetStats()
                   .url(url)
                ;
            }
            if (testURL.isWsWorkunits()) {
                return new WsWorkunits()
                    .url(url)
                ;
            }
            if (testURL.isWsEcl()) {
                return new WsECL()
                   .url(url)
                ;
            }
            return null;
        }
    };
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/ISlider',[], factory);
    } else {
        root.other_ISlider = factory();
    }
}(this, function () {
    function ISlider() {
    };

    //  Properties  ---
    ISlider.prototype._range = { low: 0, high: 100 };
    ISlider.prototype._step = 1;
    ISlider.prototype._allowRange = false;   //  TODO:  range selections is not supported yet  ---

    //  Events  ---
    ISlider.prototype.click = function (value) {
        console.log("click:  " + value);
    };
    ISlider.prototype.newSelection = function (value, value2) {
        console.log("newSelection:  " + value + ", " + value2);
    };
    return ISlider;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/IWordCloud',[], factory);
    } else {
        root.other_IWordCloud = factory();
    }
}(this, function () {
    function IWordCloud() {
    };

    IWordCloud.prototype.testData = function () {
        this.columns(["Word", "Weight"]);
        var words = ["Myriel", "Napoleon", "Mlle.Baptistine", "Mme.Magloire", "CountessdeLo", "Geborand", "Champtercier", "Cravatte", "Count", "OldMan", "Labarre", "Valjean", "Marguerite", "Mme.deR", "Isabeau", "Gervais", "Tholomyes", "Listolier", "Fameuil", "Blacheville", "Favourite", "Dahlia", "Zephine", "Fantine", "Mme.Thenardier", "Thenardier", "Cosette", "Javert", "Fauchelevent", "Bamatabois", "Perpetue", "Simplice", "Scaufflaire", "Woman1", "Judge", "Champmathieu", "Brevet", "Chenildieu", "Cochepaille", "Pontmercy", "Boulatruelle", "Eponine", "Anzelma", "Woman2", "MotherInnocent", "Gribier", "Jondrette", "Mme.Burgon", "Gavroche", "Gillenormand", "Magnon", "Mlle.Gillenormand", "Mme.Pontmercy", "Mlle.Vaubois", "Lt.Gillenormand", "Marius", "BaronessT", "Mabeuf", "Enjolras", "Combeferre", "Prouvaire", "Feuilly", "Courfeyrac", "Bahorel", "Bossuet", "Joly", "Grantaire", "MotherPlutarch", "Gueulemer", "Babet", "Claquesous", "Montparnasse", "Toussaint", "Child1", "Child2", "Brujon", "Mme.Hucheloup"].map(function (d) {
            return [ d, 10 + Math.random() * 14 ];
        });
        this.data(words);
        return this;
    };

    //  Properties  ---

    //  Events  ---
    IWordCloud.prototype.click = function (d) {
        console.log("Click:  " + d.label);
    };

    return IWordCloud;
}));

if (typeof define === "function" && define.amd) {
  define('css',[], function () { 
    return {
      load: function ($1, $2, load) { load() }
    } 
  })
};


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/MorphText.js',["../common/SVGWidget", "css!./MorphText"], factory);
    } else {
        root.other_MorphText = factory(root.common_SVGWidget);
    }
}(this, function (SVGWidget) {
    function MorphText() {
        SVGWidget.call(this);
        this._class = "other_MorphText";

        this._text = "";
        this._anchor = "middle";
        this._reverse = false;
    };
    MorphText.prototype = Object.create(SVGWidget.prototype);

    MorphText.prototype.text = function (_) {
        if (!arguments.length) return this._text;
        this._text = _;

        var usedChars = {};
        var chars = this._text.split("");
        this.data(chars.map(function(d) {
            var id = "_" + d;
            if (usedChars[id] === undefined) {
                usedChars[id] = 0;
            }
            usedChars[id]++;
            return {text: d, id: d.charCodeAt(0) + (1024 * usedChars[id])};
        }));

        return this;
    };

    MorphText.prototype.anchor = function (_) {
        if (!arguments.length) return this._anchor;
        this._anchor = _;
        return this;
    };

    MorphText.prototype.fontSize = function (_) {
        if (!arguments.length) return this._fontSize;
        this._fontSize = _;
        return this;
    };

    MorphText.prototype.reverse = function (_) {
        if (!arguments.length) return this._reverse;
        this._reverse = _;
        return this;
    };

    MorphText.prototype.enter = function (domNode, element) {
        if (!this._fontSize) {
            var style = window.getComputedStyle(domNode, null);
            this._fontSize = parseInt(style.fontSize);
        }
        this._fontWidth = this._fontSize * 32 / 48;
        this._textElement = element.append("g")
        ;
    };

    MorphText.prototype.dateTime = function() {
        var d = new Date(),
            seconds = d.getSeconds().toString().length == 1 ? '0' + d.getSeconds() : d.getSeconds(),
            minutes = d.getMinutes().toString().length == 1 ? '0' + d.getMinutes() : d.getMinutes(),
            hours = d.getHours().toString().length == 1 ? '0' + d.getHours() : d.getHours(),
            ampm = d.getHours() >= 12 ? 'pm' : 'am',
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()] + ' ' + months[d.getMonth()] + ' ' + d.getDate() + ' ' + d.getFullYear() + ' ' + hours + ':' + minutes + ':' + seconds + ampm;
    }


    MorphText.prototype.update = function (domNode, element) {
        var context = this;
        var text = this._textElement.selectAll("text")
            .data(this.data(), function (d) { return d.id; })
        ;
        text
          .attr("class", "update")
        ;
        this.transition.apply(text)
            .attr("x", function (d, i) { return (-context._data.length / 2 + i) * context._fontWidth + context._fontWidth / 2; })
        ;

        var newText = text.enter().append("text")
            .attr("class", "enter")
            .attr("font-size", this._fontSize)
            .attr("dy", ".35em")
            .attr("y", (this._reverse ? +1 : -1) * this._fontWidth * 2)
            .attr("x", function (d, i) { return (-context._data.length / 2 + i) * context._fontWidth + context._fontWidth / 2; })
            .style("fill-opacity", 1e-6)
            .style("text-anchor", this._anchor)
            .text(function (d) { return d.text; })
        ;
        this.transition.apply(newText)
            .attr("y", 0)
            .style("fill-opacity", 1)
        ;

        text.exit()
            .attr("class", "exit")
        ;
        this.transition.apply(text.exit())
            .attr("y", (this._reverse ? -1 : +1) * this._fontWidth * 2)
            .style("fill-opacity", 1e-6)
            .remove()
        ;
    };

    return MorphText;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Persist',["require"], factory);
    } else {
        root.other_Persist = factory(root.require);
    }
}(this, function (require) {
    return {
        discover: function (widget, includePrivate) {
            var retVal = [];
            for (var key in widget) {
                if (key.indexOf("__meta_") >= 0) {
                    var item = widget;
                    var meta = item[key];
                    if (meta.type || includePrivate) {
                        while (meta.type === "proxy") {
                            item = item[meta.proxy];
                            meta = item["__meta_" + meta.method];
                        }
                        if (meta.id !== widget[key].id) {
                            meta = JSON.parse(JSON.stringify(meta));  //  Clone meta so we can safely replace the id.
                            meta.id = widget[key].id;
                        }
                        retVal.push(meta);
                    }
                }
            }
            return retVal;
        },

        serializeToObject: function (widget, properties, includeData) {
            var retVal = {
                __version: 3,
                __class: widget._class,
                __id: widget._id,
                __properties: {}
            };
            if (properties && properties.length) {
                properties.forEach.forEach(function (item) {
                    if (widget[item.id + "_modified"]()) {
                        retVal.__properties[item] = widget[item]();
                    }
                });
            } else {
                this.discover(widget, true).forEach(function (item) {
                    if (widget[item.id + "_modified"]()) {
                        switch (item.type) {
                            case "widget":
                                retVal.__properties[item.id] = this.serializeToObject(widget[item.id](), null, includeData);
                                break;
                            case "widgetArray":
                                retVal.__properties[item.id] = [];
                                var widgetArray = widget[item.id]();
                                widgetArray.forEach(function (widget, idx) {
                                    retVal.__properties[item.id].push(this.serializeToObject(widget, null, includeData));
                                }, this);
                                break;
                            default:
                                retVal.__properties[item.id] = widget[item.id]();
                                break;
                        }
                    }
                }, this);
            }
            if (widget._class === "marshaller_Graph") {
                var vertices = widget.data().vertices;
                if (vertices) {
                    this.__vertices = vertices.map(function (item) {
                        return this.serializeToObject(item, null, includeData);
                    }, this);
                }
            }
            if (includeData) {
                retVal.__data = {};
                retVal.__data.columns = widget.columns();
                retVal.__data.data = widget.data();
            }
            return retVal;
        },

        serialize: function (widget, properties, includeData) {
            return JSON.stringify(this.serializeToObject(widget, properties, includeData));
        },

        deserialize: function (state, callback) {
            var context = this;
            var path = "../" + state.__class.split("_").join("/");
            require([path], function (Widget) {
                var widget = new Widget();
                if (state instanceof String) {
                    state = JSON.parse(state)
                }
                if (state.__id.indexOf("_w") !== 0) {
                    widget._id = state.__id;
                }
                var widgets = [];
                var createCount = 0;
                for (var key in state.__properties) {
                    if (widget["__meta_" + key]) {
                        switch (widget["__meta_" + key].type) {
                            case "widget":
                                ++createCount;
                                context.deserialize(state.__properties[key], function (widgetItem) {
                                    widget[key](widgetItem);
                                    --createCount;
                                });
                                break;
                            case "widgetArray":
                                ++createCount;
                                var widgetStateArray = state.__properties[key];
                                var widgetArray = [];
                                widgetArray.length = widgetStateArray.length;
                                var arrayCreateCount = 0;
                                widgetStateArray.forEach(function (widgetState, idx) {
                                    ++arrayCreateCount;
                                    context.deserialize(widgetState, function (widgetItem) {
                                        widgetArray[idx] = widgetItem;
                                        --arrayCreateCount;
                                    });
                                    var arrayIntervalHandler = setInterval(function () {
                                        if (arrayCreateCount <= 0) {
                                            clearInterval(arrayIntervalHandler);
                                            arrayCreateCount = undefined;
                                            widget[key](widgetArray);
                                            --createCount;
                                        }
                                    }, 20);
                                });
                                break;
                            default:
                                widget[key](state.__properties[key]);
                                break;
                        }
                    } else {
                        var d = 0;
                    }
                }
                var intervalHandler = setInterval(function () {
                    if (createCount <= 0) {
                        clearInterval(intervalHandler);
                        createCount = undefined;
                        if (state.__data) {
                            for (var key in state.__data) {
                                widget[key](state.__data[key]);
                            }
                        }
                        callback(widget);
                    }
                }, 20);
            });
        },

        create: function (state, callback) {
            if (typeof state === "string") {
                state = JSON.parse(state)
            }
            this.deserialize(state, callback);
        },

        clone: function (widget, callback) {
            this.create(this.serializeToObject(widget, [], true), callback);
        }
    };
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/PropertyEditor.js',["../common/Widget", "../common/HTMLWidget", "./Persist"], factory);
    } else {
        root.other_PropertyEditor = factory(root.Common_Widget, root.common_HTMLWidget, root.other_Persist);
    }
}(this, function (Widget, HTMLWidget, Persist) {
    function PropertyEditor() {
        HTMLWidget.call(this);
        this._class = "other_PropertyEditor";

        this._tag = "div";

        this._columns = ["Key", "Value"];//, ""];
        this._contentEditors = [];
    };
    PropertyEditor.prototype = Object.create(HTMLWidget.prototype);

    PropertyEditor.prototype.publish("show_columns", false, "boolean", "Show Columns");
    PropertyEditor.prototype.publish("show_data", false, "boolean", "Show Data");

    var formatJSRequire = function (widget, fieldName, properties, renderCallback, postCreate) {
        if (!widget) {
            return "";
        }
        var classParts = widget._class.split("_");
        var path = "src/" + classParts.join("/");
        var label = classParts[classParts.length - 1];
        var propertiesString = properties.split("\n").map(function (item) {
            return item.length ? "        " + item : "";
        }).join("\n");
        propertiesString += propertiesString.length ? "\n" : "";

        postCreate += postCreate.length ? "\n" : "";
        return "require([\"" + path + "\"], function(" + label + ") {\n" +
        "    var " + fieldName + " = new " + label + "()\n" +
        "        .target(\"divID\")\n" +
        propertiesString +
        "        .render(" + renderCallback.split("\n").join("\n        ") +")\n" +
        "    ;\n" +
        postCreate +
        "});"
    };

    var formatJSCallback = function (innerProp, properties, renderCallback) {
        var propertiesString = properties.split("\n").map(function (item) {
            return item.length ? "        " + item : "";
        }).join("\n");
        propertiesString += propertiesString.length ? "\n" : "";
        return "function(widget) {\n" +
        "    widget." + innerProp + "\n" +
        propertiesString +
        "        .render(" + renderCallback + ")\n" +
        "    ;\n" +
        "}"
    };

    var formatJSProperties = function (widget, includeColumns, includeData) {
        if (!widget) {
            return "";
        }
        var propsStr = Persist.discover(widget).map(function (prop) {
            if (!widget[prop.id + "_modified"]()) {
                return "";
            }
            return "." + prop.id + "(" + JSON.stringify(widget[prop.id]()) + ")"
        }).filter(function (str) {
            return str !== "";
        }).join("\n");
        if (includeColumns) {
            var columns = widget.columns();
            if (columns instanceof Array) {
                if (columns.length) {
                    propsStr += (propsStr.length ? "\n" : "")
                    propsStr += ".columns(" + JSON.stringify(columns) + ")"
                }
            } else if (columns) {
                propsStr += (propsStr.length ? "\n" : "")
                propsStr += ".columns(" + JSON.stringify(columns) + ")"
            }
        }
        if (includeData) {
            var data = widget.data();
            if (data instanceof Array) {
                if (data.length) {
                    propsStr += (propsStr.length ? "\n" : "")
                    propsStr += ".data(" + JSON.stringify(data) + ")"
                }
            } else if (data) {
                propsStr += (propsStr.length ? "\n" : "")
                try {
                    propsStr += ".data(" + JSON.stringify(data) + ")"
                } catch (e) {
                    propsStr += ".data(" + e + ")"
                }
            }
        }
        return propsStr;
    };

    PropertyEditor.prototype.getJavaScript = function (fieldName, includeColumns, includeData, postCreate) {
        postCreate = postCreate || "";
        var callbackJS = "";
        /*if (this._data._class === "chart_MultiChart" && this._data._chart) {
            callbackJS = formatJSCallback("_chart", formatJSProperties(this._data._chart, includeColumns, includeData), "");
        } else*/ if (this._data._content) {
            callbackJS = formatJSCallback("_content", formatJSProperties(this._data._content, includeColumns, includeData), "");
        }
        return formatJSRequire(this._data, fieldName, formatJSProperties(this._data, includeColumns, includeData), callbackJS, postCreate);
    };

    PropertyEditor.prototype.getPersistString = function (fieldName) {
        return "var " + fieldName + " = " + JSON.stringify(Persist.serializeToObject(this._data, null, false), null, "  ") + ";"
    };

    PropertyEditor.prototype.onChange = function (widget, propID) {
    };

    PropertyEditor.prototype.enter = function (domNode, element) {
        HTMLWidget.prototype.enter.apply(this, arguments);
        this._parentElement.style("overflow", "auto");
    };

    PropertyEditor.prototype.update = function (domNode, element) {
        HTMLWidget.prototype.update.apply(this, arguments);
        var context = this;

        var table = element.selectAll("#" + this._id + " > table").data(this._data, function (d) { return d._id; });
        table.enter().append("table")
            .each(function (widget) {
                //console.log("PE: <table>: Enter: table: " + context._id + " widget:  " + widget._id);
                var element = d3.select(this);
                var thead = element.append("thead").append("tr");
                var tbody = element.append("tbody");
                var th = thead.selectAll("th").data(context._columns, function (d) { return d; });
                th
                    .enter()
                    .append("th")
                        .text(function (column) {
                            return column;
                        })
                ;
                th.exit()
                    .remove()
                ;
            })
        ;
        table.select("tbody")
            .each(function (widget) {
                var tbody = d3.select(this);
                var rows = tbody.selectAll(".tr_" + widget._id).data(Persist.discover(widget), function (d) { return widget._id + "_" + d.id + "_" + d.type });
                var row = rows
                    .enter()
                    .append("tr")
                    .attr("class", "tr_" + widget._id)
                    .each(function (d) {
                        //console.log("PE: <tbody>: Update: widget:  " + widget._id + " <tr_" + widget._id + ">: Enter: widget:  " + widget._id + " Property:" + d.id);
                        var tr = d3.select(this)
                        tr.append("td")
                            .attr("class", "label")
                            .text(function (d) { return d.id; })
                        ;
                        var td_input = tr.append("td")
                            .attr("class", "field")
                            .each(function () {
                                var td = d3.select(this);
                                var input = null;
                                switch (d.type) {
                                    case "boolean":
                                        input = td.append("input")
                                            .attr("class", "input_" + widget._id)
                                            .attr("type", "checkbox")
                                            .on("change", function () {
                                                widget[d.id](this.checked).render(function () {
                                                    context.onChange(widget, d.id);
                                                    context.render();
                                                })
                                            })
                                        ;
                                        break;
                                    case "number":
                                    case "string":
                                        input = td.append("input")
                                            .attr("class", "input_" + widget._id)
                                            .on("change", function () {
                                                widget[d.id](this.value).render(function (widget) {
                                                    context.onChange(widget, d.id);
                                                    context.render();
                                                })
                                            })
                                        ;
                                        break;
                                    case "html-color":
                                        input = td.append("input")
                                            .attr("class", "input_" + widget._id)
                                            .on("change", function () {
                                                widget[d.id](this.value).render(function (widget) {
                                                    context.onChange(widget, d.id);
                                                    context.render();
                                                })
                                            })
                                        ;
                                        if (!context.isIE) {
                                            try {
                                                var colorInput = input;
                                                var inputColor = td.append("input")
                                                    .attr("type", "color")
                                                    .on("change", function () {
                                                        var node = colorInput.node();
                                                        node.value = this.value;
                                                        colorInput.on("change").apply(colorInput.node());
                                                    })
                                                ;
                                                inputColor.node().value = widget[d.id]();
                                            } catch (e) {
                                                inputColor.remove();
                                            }
                                        }
                                        break;
                                    case "set":
                                        input = td.append("select")
                                            .attr("class", "input_" + widget._id)
                                            .on("change", function () {
                                                widget[d.id](this.value).render(function (widget) {
                                                    context.onChange(widget, d.id);
                                                    context.render();
                                                })
                                            })
                                        ;
                                        d.set.forEach(function (item) {
                                            var option = input.append("option")
                                                .attr("value", item)
                                                .text(item)
                                            ;
                                        });
                                        break;
                                    case "array":
                                        input = td.append("textarea")
                                            .attr("class", "input_" + widget._id)
                                            .attr("rows", "4")
                                            .attr("cols", "25")
                                            .on("change", function () {
                                                widget[d.id](JSON.parse(this.value)).render(function () {
                                                    context.onChange(widget, d.id);
                                                    context.render();
                                                })
                                            })
                                        ;
                                        break;
                                    case "widget":
                                    case "widgetArray":
                                        input = td.append("div")
                                            .attr("class", "input_" + widget._id)
                                        ;
                                        widget["_propertyEditor_" + d.id] = new PropertyEditor()
                                            .target(input.node())
                                        ;
                                        widget["_propertyEditor_" + d.id].onChange = function (widget, propID) {
                                            context.onChange(widget, propID)
                                            //  No render needed  ---
                                        };
                                        break;
                                    default:
                                        break;
                                }
                            })
                        ;
                        /*
                        var td = tr.append("td");
                        var button = td
                            .append("a")
                                .text("Reset")
                        ;
                        button.on("click", function () {
                            widget[d.id + "_reset"]();
                            widget.render(function () {
                                context.onChange(widget, d.id);
                                context.render();
                            });
                        });
                        */
                    })
                ;
                rows.select(".input_" + widget._id)
                    .each(function (d) {
                        //console.log("PE: <tbody>: Update: widget:  " + widget._id + " <input_" + widget._id + ">: Update: widget:  " + widget._id + " Property:" + d.id);
                        var input = d3.select(this);
                        switch (d.type) {
                            case "boolean":
                                input.node().checked = widget[d.id]();
                                break
                            case "html-color":
                                input.node().value = widget[d.id]();
                                break;
                            case "array":
                                input.node().value = JSON.stringify(widget[d.id](), null, "  ");
                                break;
                            case "widget":
                                var innerWidget = widget[d.id]();
                                widget["_propertyEditor_" + d.id]
                                    .data(innerWidget ? [innerWidget] : [])
                                    .render()
                                ;
                                break;
                            case "widgetArray":
                                widget["_propertyEditor_" + d.id]
                                    .data(widget[d.id]())
                                    .render()
                                ;
                                break;
                            case "number":
                            case "string":
                            case "set":
                            default:
                                input.node().value = widget[d.id]();
                                break;
                        }
                    })
                ;
                rows.exit()
                    .each(function (d) {
                        var element = d3.select(this);
                        console.log("PropertyEditor exit:" + d._class + d._id);
                        switch (d.type) {
                            case "widget":
                                d.propertyEditor
                                    .target(null)
                                ;
                                break;
                            case "widgetArray":
                                element.html("");
                                break;
                        }
                    })
                    .remove()
                ;

                //  Columns  ---
                if (this._show_columns) {
                    var tr = this.tbody.append("tr");
                    var td = tr.append("td")
                        .text("columns")
                    ;
                    td = tr.append("td")
                    var input = td.append("textarea")
                        .attr("rows", "4")
                        .attr("cols", "25")
                        .on("change", function () {
                            widget
                                .columns(JSON.parse(this.value))
                                .render(function () {
                                    context.onChange(widget, "columns");
                                })
                            ;
                        })
                    ;
                    input.node().value = JSON.stringify(this._data._columns);

                }
                //  Data  ---
                if (this._show_columns) {
                    var tr = this.tbody.append("tr");
                    var td = tr.append("td")
                        .text("data")
                    ;
                    td = tr.append("td")
                    input = td.append("textarea")
                        .attr("rows", "4")
                        .attr("cols", "25")
                        .on("change", function () {
                            widget
                                .data(JSON.parse(this.value))
                                .render(function () {
                                    context.onChange("data");
                                })
                            ;
                        })
                    ;
                    try {
                        input.node().value = JSON.stringify(this._data._data);
                    } catch (e) {
                        input.node().value = e;
                    }
                }
            })
        ;
        table.exit()
            .each(function (widget) {
            })
            .remove()
        ;
    };

    PropertyEditor.prototype.exit = function (domNode, element) {
        HTMLWidget.prototype.exit.apply(this, arguments);
    };

    PropertyEditor.prototype.click = function (d) {
    };

    return PropertyEditor;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Slider.js',["../common/SVGWidget", "./ISlider", "css!./Slider"], factory);
    } else {
        root.other_Slider = factory(root.common_SVGWidget, root.other_ISlider);
    }
}(this, function (SVGWidget, ISlider) {
    function Slider() {
        SVGWidget.call(this);
        ISlider.call(this);
        this._class = "other_Slider";

        this._selectionLabel = "";

        this.xScale = d3.scale.linear()
            .clamp(true)
        ;
        var context = this;
        this.brush = d3.svg.brush()
            .x(this.xScale)
            .extent([0, 0])
            .on("brushstart", function (d) { context.brushstart(d, this); })
            .on("brush", function (d) { context.brushmove(d, this); })
            .on("brushend", function (d) { context.brushend(d, this); })
        ;
        this.brush.empty = function () {
            return false;
        };

        this.axis = d3.svg.axis()
              .scale(this.xScale)
              .orient("bottom")
              .tickFormat(function (d) { return d; })
              .tickSize(0)
              .tickPadding(12)
        ;
    };
    Slider.prototype = Object.create(SVGWidget.prototype);
    Slider.prototype.implements(ISlider.prototype);

    Slider.prototype.publish("allowRange", false, "boolean", "Allow Range Selection");
    Slider.prototype.publish("low", 0, "number", "Low");
    Slider.prototype.publish("high", 100, "number", "High");
    Slider.prototype.publish("step", 10, "number", "Step");
    Slider.prototype.publish("selectionLabel", "", "string", "Selection Label");

    Slider.prototype.testData = function (_) {
        this.columns("Percent");
        this.data(66);
        return this;
    };

    Slider.prototype.testData2 = function (_) {
        this.allowRange(true);
        this.columns("Percent");
        this.data([44, 66]);
        return this;
    };

    Slider.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            if (this.brushg) {
                this.brushg
                    .call(this.brush.extent(this._allowRange ? this._data : [this._data, this._data]))
                ;
            }
        }
        return retVal;
    };

    Slider.prototype.enter = function (domNode, element) {
        if ((this._high - this._low) / this._step <= 10) {
            this.axis.tickValues(d3.merge([d3.range(this._low, this._high, this._step), [this._high]]));
        }

        this.axisElement = element.append("g")
            .attr("class", "x axis")
        ;

        this.brushg = element.append("g")
            .attr("class", "brush")
            .call(this.brush)
        ;

        this.brushg.select(".background")
            .attr("y", -9)
            .attr("height", 18)
        ;

        this.brushg.select(".extent")
            .attr("y", "-10")
            .attr("height", "20")
        ;

        this.brushg.selectAll(".resize").select("rect")
            .attr("x", function (d) { return d === "e" ? 0 : -8; })
            .attr("y", "-10")
            .attr("width", "8")
            .attr("height", "20")
        ;

        this.handle = this.brushg.selectAll(".resize").append("path")
            .attr("class", "handle")
            .attr("transform", "translate(0,-27)")
        ;
    };

    Slider.prototype.update = function (domNode, element) {
        var context = this;
        var width = this.width() - 50;  //TODO - 50 should be "padding"

        this.xScale
            .domain([this._low, this._high])
            .range([-width/2, width/2])
        ;

        this.axisElement
            .call(this.axis)
        ;

        var range = this.xScale.range();
        this.brushg.select(".background")
            .attr("x", range[0])
            .attr("width", range[1] - range[0])
        ;

        this.handle
            .attr("d", function (d) { return context.handlePath(d); })
        ;

        if (this._initHandle === undefined) {
            this._initHandle = true;
            var selVal = [this._low, this._low];
            if (this._allowRange && this._data) {
                var selVal = this._data;
            } else if (this._data){
                selVal = [this._data, this._data];
            }
            this.brushg
                .call(this.brush.extent(selVal))
            ;
        }
    };

    Slider.prototype.brushstart = function (d, self) {
        if (!d3.event || !d3.event.sourceEvent) return;
        d3.event.sourceEvent.stopPropagation();
    };

    Slider.prototype.brushmove = function (d, self) {
        if (!d3.event || !d3.event.sourceEvent) return;
        d3.event.sourceEvent.stopPropagation();
        if (!this._allowRange) {
            var mouseX = this.xScale.invert(d3.mouse(self)[0]);
            d3.select(self)
                .call(this.brush.extent([mouseX, mouseX]))
            ;
        }
    };

    Slider.prototype.brushend = function (d, self) {
        if (!d3.event || !d3.event.sourceEvent) return;
        d3.event.sourceEvent.stopPropagation();
        if (!this._allowRange) {
            var mouseX = this.nearestStep(this.xScale.invert(d3.mouse(self)[0]));
            d3.select(self)
                .call(this.brush.extent([mouseX, mouseX]))
            ;
            this._data = mouseX;
            if (this._selectionLabel) {
                var clickData = {};
                clickData[this._selectionLabel] = mouseX;
                this.click(clickData);
            } else {
                this.click(mouseX);
            }
        } else {
            var extent = this.brush.extent();
            extent[0] = this.nearestStep(extent[0]);
            extent[1] = this.nearestStep(extent[1]);
            this._data = extent;
            d3.select(self)
                .call(this.brush.extent(extent))
            ;
            this.newSelection(extent[0], extent[1]);
        }
    };

    Slider.prototype.nearestStep = function (value) {
        return this._low + Math.round((value - this._low) / this._step) * this._step;
    }

    Slider.prototype.handlePath = function (d, i) {
        var e = +(d === "e");
        var x = e ? 1 : -1;
        var xOffset = this._allowRange ? 0.5 : 0.0;
        var y = 18;
        var retVal = "M" + (xOffset * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (xOffset * x) + "," + (2 * y)
        ;
        if (this._allowRange) {
            retVal += "Z"
                + "M" + (2.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8)
                + "M" + (4.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8)
            ;
        } else {
            retVal += "M" + (1 * x) + "," + (y + 8)
                + "V" + (2 * y - 8)
            ;
        };
        return retVal;
    };

    return Slider;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Table.js',["../common/HTMLWidget", "css!./Table"], factory);
    } else {
        root.other_Table = factory(root.common_HTMLWidget);
    }
}(this, function (HTMLWidget) {
    function Table() {
        HTMLWidget.call(this);
        this._class = "other_Table";

        this._tag = "table";

        this._columns = [];
    };
    Table.prototype = Object.create(HTMLWidget.prototype);

    Table.prototype.testData = function () {
        this
            .columns(["Lat", "Long", "Pin"])
            .data([
                [37.665074, -122.384375, "green-dot.png"],
                [32.690680, -117.178540],
                [39.709455, -104.969859],
                [41.244123, -95.961610],
                [32.688980, -117.192040],
                [45.786490, -108.526600],
                [45.796180, -108.535652],
                [45.774320, -108.494370],
                [45.777062, -108.549835, "red-dot.png"]
            ])
        ;
        return this;
    };

    Table.prototype.enter = function (domNode, element) {
        HTMLWidget.prototype.enter.apply(this, arguments);
        this._parentElement.style("overflow", "auto");
        this.thead = element.append("thead").append("tr");
        this.tbody = element.append("tbody");
    };

    Table.prototype.update = function (domNode, element) {
        HTMLWidget.prototype.update.apply(this, arguments);
        var context = this;

        var th = this.thead.selectAll("th").data(this._columns, function (d) { return d;});
        th
            .enter()
            .append("th")
                .text(function (column) {
                    return column;
                })
        ;
        th.exit()
            .remove()
        ;

        var rows = this.tbody.selectAll("tr").data(this._data);
        rows
            .enter()
            .append("tr")
            .on("click", function (d) {
                context.click(context.rowToObj(d));
            })
        ;
        rows.exit()
            .remove()
        ;

        var cells = rows.selectAll("td").data(function (row, i) {
            return row;
        });
        cells.enter()
            .append("td")
        ;
        cells
            .text(function (d) {
                if (d instanceof String) {
                    return d.trim();
                }
                return d;
            })
        ;
        cells.exit()
            .remove()
        ;
    };

    Table.prototype.exit = function (domNode, element) {
        this.thead.remove();
        this.tbody.remove();
    };

    Table.prototype.click = function (d) {
    };

    return Table;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/WordCloud.js',["../common/SVGWidget", "./IWordCloud", "d3/d3", "css!./WordCloud"], factory);
    } else {
        root.other_WordCloud = factory(root.common_SVGWidget, root.other_IWordCloud, root.d3);
    }
}(this, function (SVGWidget, IWordCloud, d3) {
    function WordCloud() {
        SVGWidget.call(this);
        IWordCloud.call(this);
        this._class = "other_WordCloud";
    };
    WordCloud.prototype = Object.create(SVGWidget.prototype);
    WordCloud.prototype.implements(IWordCloud.prototype);

    WordCloud.prototype.publish("padding", 1, "number", "Padding");
    WordCloud.prototype.publish("font", "Verdana", "string", "Font Name");
    WordCloud.prototype.publish("fontSizeFrom", 6, "number", "Font Size From");
    WordCloud.prototype.publish("fontSizeTo", 24, "number", "Font Size To");
    WordCloud.prototype.publish("angleFrom", -60, "number", "Angle From");
    WordCloud.prototype.publish("angleTo", 60, "number", "Angle To");
    WordCloud.prototype.publish("angleCount", 5, "number", "Angle Count");

    WordCloud.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this._vizData = _.map(function (row) {
                var retVal = {};
                for (var key in row) {
                    retVal["__viz_" + key] = row[key];
                }
                return retVal;
            });
        }
        return retVal;
    };

    WordCloud.prototype.enter = function (domNode, element) {
        this.cloud = d3.layout.cloud()
            .font(this._font)
            .padding(this._padding)
        ;
        this.svg = element.append("g");
    };

    WordCloud.prototype.update = function (domNode, element) {
        var context = this;
        var extent = d3.extent(this._vizData, function (d) {
            return d.__viz_1;
        });
        var scale = d3.scale.log().domain(extent).range([this._fontSizeFrom, this._fontSizeTo]);

        var angleDomain = d3.scale.linear().domain([0, context._angleCount - 1]).range([context._angleFrom, context._angleTo]);

        this.cloud
            .size([this.width(), this.height()])
            .words(this._vizData)
            .rotate(function () {
                return angleDomain(~~(Math.random() * context._angleCount));
            })
            .fontSize(function (d) {
                return scale(d.__viz_1);
            })
            .on("end", draw)
            .start()
        ;

        function draw(data, bounds) {
            var fill = d3.scale.category20();
            var text = context.svg.selectAll("text")
                .data(data, function (d) { return d.__viz_0 ? d.__viz_0.toLowerCase() : ""; })
            ;
            text.transition()
                .duration(1000)
                .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
                .style("font-size", function (d) {
                    return scale(d.__viz_1) + "px";
                })
                .style("opacity", 1)
            ;
            text.enter().append("text")
                .attr("text-anchor", "middle")
                .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
                .style("font-size", function(d) {
                    return scale(d.__viz_1) + "px";
                })
                .style("font-family", function (d) { return d.font; })
                .style("fill", function (d) { return fill(d.__viz_0 ? d.__viz_0.toLowerCase() : ""); })
                .text(function (d) { return d.__viz_0; })
                .on("click", function (d) {
                    context.click({label:  d.__viz_0, weight: d.__viz_1});
                })
                .style("opacity", 1e-6)
              .transition()
                .duration(1000)
                .style("opacity", 1)
            ;

            text.exit().transition().duration(1000)
                .style("opacity", 1e-4)
                .remove()
            ;

            if (bounds) {
                var w = context.width();
                var h = context.height();
                var dx = bounds[1].x - bounds[0].x,
                    dy = bounds[1].y - bounds[0].y,
                    borderScale = .9 / Math.max(dx / w, dy / h);
                context.svg.transition().delay(1000).duration(750)
                    .attr("transform", "scale(" + borderScale + ")")
                ;
            }
        }
    };

    WordCloud.prototype.render = function (callback) {
        var context = this;
        require(["d3-cloud/d3.layout.cloud"], function (d3LayoutClout) {
            SVGWidget.prototype.render.call(context, callback);
        });
        return this;
    };

    return WordCloud;
}));

