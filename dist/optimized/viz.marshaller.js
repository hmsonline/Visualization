
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('marshaller/HipieDDL.js',["../other/Comms", "../common/Widget"], factory);
    } else {
        root.marshaller_HipieDDL = factory(root.other_Comms, root.common_Widget);
    }
}(this, function (Comms, Widget) {
    var Vertex = null;
    var Edge = null;
    var exists = function (prop, scope) {
        var propParts = prop.split(".");
        var testScope = scope;
        for (var i = 0; i < propParts.length; ++i) {
            var item = propParts[i];
            if (!testScope || testScope[item] === undefined) {
                return false;
            }
            testScope = testScope[item];
        }
        return true;
    };

    //  Mappings ---
    function SourceMappings(visualization, mappings) {
        this.visualization = visualization;
        this.mappings = mappings;

        this.hasMappings = false;
        this.reverseMappings = {};
        this.columns = [];
        this.columnsIdx = {};
        this.columnsRHS = [];
        this.columnsRHSIdx = {};
    };

    SourceMappings.prototype.init = function() {
        for (var key in this.mappings) {
            this.reverseMappings[this.mappings[key]] = key;
            if (this.columnsIdx[key] === undefined) {
                this.columns.push(key);
                this.columnsIdx[key] = this.columns.length - 1;
            }
            this.columnsRHS[this.columnsIdx[key]] = this.mappings[key];
            this.columnsRHSIdx[this.mappings[key]] = this.columnsIdx[key];
            this.hasMappings = true;
        }
    };

    SourceMappings.prototype.contains = function (key) {
        return this.mappings[key] !== undefined;
    };

    SourceMappings.prototype.doMap = function (item) {
        var retVal = [];
        try {
            for (var key in this.mappings) {
                var rhsKey = this.mappings[key];
                var val = item[rhsKey];
                if (val === undefined) {
                    val = item[rhsKey.toLowerCase()];
                }
                retVal[this.columnsIdx[key]] = val;
            }
        } catch (e) {
            console.log("Invalid Mappings");
        }
        return retVal;
    };

    SourceMappings.prototype.doMapAll = function (data) {
        var context = this;
        return data.map(function (item) {
            return context.doMap(item);
        });
    };

    SourceMappings.prototype.getMap = function (key) {
        return this.mappings[key];
    };

    SourceMappings.prototype.getReverseMap = function (key) {
        return this.reverseMappings[key];
    };

    function ChartMappings(visualization, mappings) {
        SourceMappings.call(this, visualization, mappings);
        this.columns = ["label", "weight"];
        this.columnsIdx = { label: 0, weight: 1 };
        this.init();
    };
    ChartMappings.prototype = Object.create(SourceMappings.prototype);

    function ChoroMappings(visualization, mappings) {
        SourceMappings.call(this, visualization, mappings);
        if (mappings.state) {
            this.columns = ["state", "weight"];
            this.columnsIdx = { state: 0, weight: 1 };
        } else if (mappings.county) {
            this.columns = ["county", "weight"];
            this.columnsIdx = { county: 0, weight: 1 };
        }
        this.init();
    };
    ChoroMappings.prototype = Object.create(SourceMappings.prototype);

    function LineMappings(visualization, mappings) {
        var newMappings = {
            label: mappings.x[0]
        };
        mappings.y.forEach(function(item, idx) {
            newMappings[item] = item;
        });
        SourceMappings.call(this, visualization, newMappings);
        this.init();
    };
    LineMappings.prototype = Object.create(SourceMappings.prototype);

    function TableMappings(visualization, mappings) {
        var newMappings = {};
        for (var key in mappings) {
            mappings[key].forEach(function (mapingItem, idx) {
                newMappings[visualization.label[idx]] = mapingItem;
            });
        }
        SourceMappings.call(this, visualization, newMappings);
        this.init();
    };
    TableMappings.prototype = Object.create(SourceMappings.prototype);

    function GraphMappings(visualization, mappings, link) {
        SourceMappings.call(this, visualization, mappings);
        this.columns = ["uid", "label", "weight", "flags"];
        this.columnsIdx = { uid: 0, label: 1, weight: 2, flags: 3 };
        this.init();
        this.link = link;
    };
    GraphMappings.prototype = Object.create(SourceMappings.prototype);

    GraphMappings.prototype.doMapAll = function (data) {
        var context = this;
        var vertexMap = {};
        var vertices = [];
        function getVertex(item) {
            var id = "uid_" + item[0];
            var retVal = vertexMap[id];
            if (!retVal) {
                retVal = new Vertex()
                    .faChar("\uf128")
                    .text(item[1])
                ;
                retVal.__hpcc_uid = item[0];
                vertexMap[id] = retVal;
                vertices.push(retVal);
            }
            return retVal;
        };
        var edges = [];
        data.forEach(function (item) {
            var mappedItem = context.doMap(item);
            var vertex = getVertex(mappedItem);
            if (item[context.link.childfile] && item[context.link.childfile].Row) {
                var childItems = item[context.link.childfile].Row;
                childItems.forEach(function (childItem, i) {
                    var childMappedItem = context.doMap(childItem);
                    var childVertex = getVertex(childMappedItem);
                    if (vertex.id() !== childVertex.id()) {
                        var edge = new Edge()
                            .sourceVertex(vertex)
                            .targetVertex(childVertex)
                            .sourceMarker("circleFoot")
                            .targetMarker("arrowHead")
                        ;
                        edges.push(edge);
                    }
                });
            }
        })
        return { vertices: vertices, edges: edges, merge: false };
    };

    //  Viz Source ---
    function Source(visualization, source) {
        this.visualization = visualization;
        this._id = source.id;
        this._output = source.output;
        this.mappings = null;
        switch(this.visualization.type) {
            case "LINE":
                this.mappings = new LineMappings(this.visualization, source.mappings);
                break;
            case "TABLE":
                this.mappings = new TableMappings(this.visualization, source.mappings);
                break;
            case "GRAPH":
                this.mappings = new GraphMappings(this.visualization, source.mappings, source.link);
                break;
            case "CHORO":
                this.mappings = new ChoroMappings(this.visualization, source.mappings, source.link);
                break;
            default:
                this.mappings = new ChartMappings(this.visualization, source.mappings);
                break;
        }
        this.first = source.first;
        this.reverse = source.reverse;
        this.sort = source.sort;
    };

    Source.prototype.getQualifiedID = function () {
        return this.visualization.getQualifiedID() + "." + this.id;
    };

    Source.prototype.exists = function () {
        return this._id;
    };

    Source.prototype.getDatasource = function () {
        return this.visualization.dashboard.datasources[this._id];
    };

    Source.prototype.getOutput = function () {
        var datasource = this.getDatasource();
        if (datasource && datasource.outputs) {
            return datasource.outputs[this._output];
        }
        return null;
    };

    Source.prototype.hasData = function () {
        return this.getOutput().data ? true : false;
    };

    Source.prototype.getColumns = function () {
        return this.mappings.columns;
    };

    Source.prototype.getData = function () {
        var context = this;
        var data = this.getOutput().data;
        if (this.sort) {
            var context = this;
            data.sort(function (l, r) {
                for (var i = 0; i < context.sort.length; ++i) {
                    var sortField = context.sort[i];
                    var reverse = false;
                    if (sortField.indexOf("-") === 0) {
                        sortField = sortField.substring(1);
                        reverse = true;
                    }
                    var lVal = l[sortField];
                    if (lVal === undefined) {
                        lVal = l[sortField.toLowerCase()];
                    }
                    var rVal = r[sortField];
                    if (rVal === undefined) {
                        rVal = r[sortField.toLowerCase()];
                    }

                    if (lVal !== rVal) {
                        return reverse ? rVal - lVal : lVal - rVal;
                    }
                }
                return 0;
            });
        }
        if (this.reverse) {
            data.reverse();
        }
        if (this.first && data.length > this.first) {
            data.length = this.first;
        }
        return this.mappings.doMapAll(data);
    };

    //  Viz Select ---
    function Select(visualization, onSelect) {
        this.visualization = visualization;
        if (onSelect) {
            this._updates = onSelect.updates;
            this.mappings = onSelect.mappings;
        }
    };

    Select.prototype.exists = function () {
        return this._updates !== undefined;
    };

    Select.prototype.getUpdatesDatasources = function () {
        var dedup = {};
        var retVal = [];
        if (exists("_updates", this) && this._updates instanceof Array) {
            this._updates.forEach(function (item, idx) {
                var datasource = this.visualization.dashboard.datasources[item.datasource];
                if (!dedup[datasource.id]) {
                    dedup[datasource.id] = true;
                    retVal.push(datasource);
                }
            }, this);
        } else if (exists("_updates.datasource", this)) { //TODO For backward compatability - Remove in the future  ---
            retVal.push(this.visualization.dashboard.datasources[this._updates.datasource]);
        }
        return retVal;
    };

    Select.prototype.getUpdatesVisualizations = function () {
        var dedup = {};
        var retVal = [];
        if (exists("_updates", this) && this._updates instanceof Array) {
            this._updates.forEach(function (item, idx) {
                var visualization = this.visualization.dashboard.visualizations[item.visualization];
                if (!dedup[visualization.id]) {
                    dedup[visualization.id] = true;
                    retVal.push(visualization);
                }
            }, this);
        } else if (exists("_updates.visualization", this)) { //TODO For backward compatability - Remove in the future  ---
            retVal.push(this.visualization.dashboard.visualizations[this._updates.visualization]);
        }
        return retVal;
    };

    //  Visualization ---
    function Visualization(dashboard, visualization) {
        this.dashboard = dashboard;
        this.id = visualization.id;
        this.label = visualization.label;
        this.title = visualization.title || visualization.id;
        this.type = visualization.type;
        this.properties = visualization.properties || visualization.source.properties || {};
        this.source = new Source(this, visualization.source);
        this.onSelect = new Select(this, visualization.onSelect);

        var context = this;
        switch (this.type) {
            case "CHORO":
                this.loadWidget(this.source.mappings.contains("county") ? "src/map/ChoroplethCounties" : "src/map/ChoroplethStates", function (widget) {
                    widget
                        .id(visualization.id)
                    ;
                });
                break;
            case "2DCHART":
            case "PIE":
            case "BUBBLE":
            case "BAR":
            case "WORD_CLOUD":
                this.loadWidget("src/chart/MultiChart", function (widget) {
                    widget
                        .id(visualization.id)
                        .chart_type(context.properties.charttype || context.type)
                    ;
                });
                break;
            case "LINE":
                this.loadWidget("src/chart/MultiChart", function (widget) {
                    widget
                        .id(visualization.id)
                        .chart_type(context.properties.charttype || context.type)
                    ;
                });
                break;
            case "TABLE":
                this.loadWidget("src/other/Table", function (widget) {
                    widget
                        .id(visualization.id)
                        .columns(context.label)
                    ;
                });
                break;
            case "SLIDER":
                this.loadWidget("src/other/Slider", function (widget) {
                    widget
                        .id(visualization.id)
                    ;
                    if (visualization.range) {
                        var selectionLabel = "";
                        for (var key in visualization.onSelect.mappings) {
                            selectionLabel = key;
                            break;
                        }
                        widget
                            .low(+visualization.range[0])
                            .high(+visualization.range[1])
                            .step(+visualization.range[2])
                            .selectionLabel(selectionLabel)
                        ;
                    }
                });
                break;
            case "GRAPH":
                this.loadWidgets(["src/graph/Graph", "src/graph/Vertex", "src/graph/Edge"], function (widget, widgetClasses) {
                    Vertex = widgetClasses[1];
                    Edge = widgetClasses[2];
                    widget
                        .id(visualization.id)
                        .layout("ForceDirected2")
                        .shrinkToFitOnLayout(true)
                    ;
                });
                break;
            default:
                this.loadWidget("src/common/TextBox", function (widget) {
                    widget
                        .id(visualization.id)
                        .text(context.id + "\n" + "TODO:  " + context.type)
                    ;
                });
                break;
        }
    };

    Visualization.prototype.getQualifiedID = function () {
        return this.dashboard.getQualifiedID() + "." + this.id;
    };

    Visualization.prototype.isLoading = function (widgetPath, callback) {
        return this.widget === null;
    };

    Visualization.prototype.isLoaded = function (widgetPath, callback) {
        return this.widget instanceof Widget;
    };

    Visualization.prototype.loadWidget = function (widgetPath, callback) {
        this.loadWidgets([widgetPath], callback);
    };

    Visualization.prototype.loadWidgets = function (widgetPaths, callback) {
        this.widget = null;

        var context = this;
        require(widgetPaths, function (Widget) {
            context.setWidget(new Widget());
            if (callback) {
                callback(context.widget, arguments);
            }
        });
    };

    Visualization.prototype.setWidget = function (widget, skipProperties) {
        this.widget = widget;

        var context = this;
        if (this.widget.vertex_dblclick) {
            this.widget.vertex_dblclick = function (d) {
                context.click({
                    uid: d.__hpcc_uid
                });
            }
        } else if (this.widget.click) {
            this.widget.click = function (d) {
                context.click(d);
            }
        }
        if (!skipProperties) {
            for (var key in this.properties) {
                if (this.widget[key]) {
                    try {
                        this.widget[key](this.properties[key])
                    } catch (e) {
                        console.log("Invalid Property:" + this.id + ".properties." + key);
                    }
                }
            }
        }
        return this.widget;
    };

    Visualization.prototype.accept = function (visitor) {
        visitor.visit(this);
    };

    Visualization.prototype.notify = function () {
        var context = this;
        if (this.source.hasData()) {
            if (this.widget) {
                var columns = this.source.getColumns();
                this.widget.columns(columns);
                var data = this.source.getData();
                this.dashboard.marshaller.updateViz(this, data);
                this.widget.data(data);

                var params = this.source.getOutput().getParams();
                if (exists("widget.title", this)) {
                    this.widget.title(this.title + (params ? " (" +params + ")": ""));
                    this.widget.render();
                } else if (exists("widgetSurface.title", this)) {
                    this.widgetSurface.title(this.title + (params ? " (" + params + ")" : ""));
                    this.widgetSurface.render();
                } else {
                    this.widget.render();
                }
            }
        }
    };

    Visualization.prototype.click = function (d) {
        if (this.onSelect.exists()) {
            var request = {};
            for (var key in this.onSelect.mappings) {
                var origKey = this.source.mappings.hasMappings ? this.source.mappings.getReverseMap(key) : key;
                request[this.onSelect.mappings[key]] = d[origKey];
            }
            var dataSources = this.onSelect.getUpdatesDatasources();
            dataSources.forEach(function (item) {
                item.fetchData(request);
            });
        }
    };

    //  Output  ---
    function Output(dataSource, output) {
        this.dataSource = dataSource;
        this.id = output.id;
        this.from = output.from;
        this.request = {};
        this.notify = output.notify || [];
        this.filter = output.filter || [];
    };

    Output.prototype.getQualifiedID = function () {
        return this.dataSource.getQualifiedID() + "." + this.id;
    };

    Output.prototype.getParams = function () {
        var retVal = "";
        for (var key in this.request) {
            if (retVal.length) {
                retVal += ", ";
            }
            retVal += this.request[key];
        }
        return retVal;
    };

    Output.prototype.accept = function (visitor) {
        visitor.visit(this);
    };

    Output.prototype.setData = function (data, request) {
        var context = this;
        this.request = request;
        this.data = data;
        this.notify.forEach(function (item) {
            var viz = context.dataSource.dashboard.visualizations[item];
            viz.notify();
        });
    };

    //  DataSource  ---
    function DataSource(dashboard, dataSource, proxyMappings) {
        this.dashboard = dashboard;
        this.id = dataSource.id
        this.filter = dataSource.filter || [];
        this.WUID = dataSource.WUID;
        this.URL = dataSource.URL;
        this.databomb = dataSource.databomb;
        this.request = {};

        var context = this;
        this.outputs = {};
        var hipieResults = [];
        dataSource.outputs.forEach(function (item) {
            context.outputs[item.id] = new Output(context, item);
            hipieResults.push({
                id: item.id,
                from: item.from,
                filter: item.filter || this.filter
            });
        }, this);

        if (this.WUID) {
            this.comms = new Comms.HIPIEWorkunit()
                .url(dashboard.marshaller.espUrl._url)
                .proxyMappings(proxyMappings)
                .hipieResults(hipieResults)
            ;
        } else if (this.databomb) {
            this.comms = new Comms.HIPIEDatabomb()
                .hipieResults(hipieResults)
            ;
        } else {
            this.comms = new Comms.HIPIERoxie()
                .url(dataSource.URL)
                .proxyMappings(proxyMappings)
            ;
        }
    };

    DataSource.prototype.getQualifiedID = function () {
        return this.dashboard.getQualifiedID() + "." + this.id;
    };

    DataSource.prototype.accept = function (visitor) {
        visitor.visit(this);
        for (var key in this.outputs) {
            this.outputs[key].accept(visitor);
        }
    };

    DataSource.prototype.fetchData = function (request, refresh) {
        var context = this;
        this.request.refresh = refresh ? true : false;
        this.filter.forEach(function (item) {
            context.request[item + "_changed"] = false;
        });
        for (var key in request) {
            this.request[key] = request[key];
            this.request[key + "_changed"] = true;
        }
        this.comms.call(this.request, function (response) {
            context.processResponse(response, request);
        });
    };

    DataSource.prototype.processResponse = function (response, request) {
        var lowerResponse = {};
        for (var key in response) {
            lowerResponse[key.toLowerCase()] = response[key];
        }
        for (var key in this.outputs) {
            var from = this.outputs[key].from;
            if (!from) {
                //  Temp workaround for older services  ---
                from = this.outputs[key].id.toLowerCase();
            }
            if (exists(from, response) && (!exists(from + "_changed", response) || (exists(from + "_changed", response) && response[from + "_changed"].length && response[from + "_changed"][0][from + "_changed"]))) {
                this.outputs[key].setData(response[from], request);
            } else if (exists(from, lowerResponse)) {// && exists(from + "_changed", lowerResponse) && lowerResponse[from + "_changed"].length && lowerResponse[from + "_changed"][0][from + "_changed"]) {
                console.log("DDL 'DataSource.From' case is Incorrect");
                this.outputs[key].setData(lowerResponse[from], request);
            }
        }
    };

    //  Dashboard  ---
    function Dashboard(marshaller, dashboard, proxyMappings) {
        this.marshaller = marshaller;
        this.id = dashboard.id;
        this.title = dashboard.title;

        var context = this;
        this.datasources = {};
        this.datasourceTotal = 0;
        dashboard.datasources.forEach(function (item) {
            context.datasources[item.id] = new DataSource(context, item, proxyMappings);
            ++context.datasourceTotal;
        });

        this.visualizations = {};
        this.visualizationsArray = [];
        dashboard.visualizations.forEach(function (item) {
            var newItem = new Visualization(context, item);
            context.visualizations[item.id] = newItem;
            context.visualizationsArray.push(newItem);
        });
        this.visualizationTotal = this.visualizationsArray.length;
        var vizIncluded = {};
        this.visualizationsTree = [];
        var walkSelect = function (viz, result) {
            if (viz && !vizIncluded[viz.id]) {
                vizIncluded[viz.id] = true;
                var treeItem = { visualization: viz, children: [] };
                result.push(treeItem);
                var visualizations = viz.onSelect.getUpdatesVisualizations();
                visualizations.forEach(function (item) {
                    walkSelect(item, treeItem.children);
                });
            }
        };
        this.visualizationsArray.forEach(function (item) {
            walkSelect(item, this.visualizationsTree);
        }, this);
    };

    Dashboard.prototype.getQualifiedID = function () {
        return this.id;
    };

    Dashboard.prototype.accept = function (visitor) {
        visitor.visit(this);
        for (var key in this.datasources) {
            this.datasources[key].accept(visitor);
        }
        this.visualizationsArray.forEach(function (item) {
            item.accept(visitor);
        }, this);
    };

    Dashboard.prototype.allVisualizationsLoaded = function () {
        var notLoaded = this.visualizationsArray.filter(function (item) { return !item.isLoaded(); });
        return notLoaded.length === 0;
    };

    //  Marshaller  ---
    function Marshaller() {
        this._proxyMappings = {};
    };

    Marshaller.prototype.accept = function (visitor) {
        visitor.visit(this);
        this.dashboardTotal = 0;
        for (var key in this.dashboards) {
            this.dashboards[key].accept(visitor);
            ++this.dashboardTotal;
        }
    };

    Marshaller.prototype.url = function (url, callback) {
        this.espUrl = new Comms.ESPUrl()
            .url(url)
        ;
        var transport = null;
        var hipieResultName = "HIPIE_DDL";
        if (this.espUrl.isWorkunitResult()) {
            hipieResultName = this.espUrl._params["ResultName"];
            transport = new Comms.HIPIEWorkunit()
                .url(url)
                .proxyMappings(this._proxyMappings)
            ;
        } else {
            transport = new Comms.HIPIERoxie()
                .url(url)
                .proxyMappings(this._proxyMappings)
            ;
        }
        var request = {
            refresh: false
        };

        var context = this;
        transport
            .call(request, function (response) {
                if (exists(hipieResultName, response)) {
                    transport.fetchResult(hipieResultName, function (ddlResponse) {
                        var json = ddlResponse[0][hipieResultName];
                        //  Temp Hack  ---
                        var ddlParts = json.split("<RoxieBase>\\");
                        if (ddlParts.length > 1) {
                            var urlEndQuote = ddlParts[1].indexOf("\"");
                            ddlParts[1] = ddlParts[1].substring(urlEndQuote);
                            json = ddlParts.join(url);
                        }
                        //  ---  ---
                        context.parse(json, function () {
                            callback(response);
                        });
                    });
                }
            })
        ;
    };

    Marshaller.prototype.proxyMappings = function (_) {
        if (!arguments.length) return this._proxyMappings;
        this._proxyMappings = _;
        return this;
    }

    Marshaller.prototype.parse = function (json, callback) {
        var context = this;
        this._json = json;
        this._jsonParsed = JSON.parse(this._json);
        this.dashboards = {};
        this.dashboardArray = [];
        this._jsonParsed.forEach(function (item) {
            var newDashboard = new Dashboard(context, item, context._proxyMappings);
            context.dashboards[item.id] = newDashboard;
            context.dashboardArray.push(newDashboard);
        });
        this.ready(callback);
        return this;
    };

    Marshaller.prototype.allDashboardsLoaded = function () {
        return this.dashboardArray.filter(function (item) { return !item.allVisualizationsLoaded(); }).length === 0;
    };

    Marshaller.prototype.ready = function (callback) {
        if (!callback) {
            return;
        }
        var context = this;
        function waitForLoad(callback) {
            if (context.allDashboardsLoaded()) {
                callback();
            } else {
                setTimeout(waitForLoad, 100, callback);
            }
        };
        waitForLoad(callback);
    };

    Marshaller.prototype.updateViz = function (vizInfo, data) {
    };

    return {
        exists: exists,
        Marshaller: Marshaller,
        Dashboard: Dashboard,
        DataSource: DataSource,
        Output: Output,
        Visualization: Visualization
    };
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('marshaller/Graph.js',["d3/d3", "../common/SVGWidget", "../common/TextBox", "../common/Surface", "../common/ResizeSurface", "../chart/MultiChartSurface", "../common/Palette", "../graph/Graph", "../graph/Vertex", "../graph/Edge", "./HipieDDL"], factory);
    } else {
        root.marshaller_Graph = factory(root.d3, root.common_SVGWidget, root.common_TextBox, root.common_Surface, root.common_ResizeSurface, root.chart_MultiChartSurface, root.common_Palette, root.graph_Graph, root.graph_Vertex, root.graph_Edge, root.marshaller_HipieDDL);
    }
}(this, function (d3, SVGWidget, TextBox, Surface, ResizeSurface, MultiChartSurface, Palette, GraphWidget, Vertex, Edge, HipieDDL) {
    function createGraphData(marshaller, databomb, visualizeRoxie) {
        if (databomb instanceof Object) {
        } else if (databomb){
            databomb = JSON.parse(databomb);
        }
        var curr = null;
        var dashboards = {};
        marshaller.accept({
            _visualizeRoxie: visualizeRoxie,
            visit: function (item) {
                if (item instanceof HipieDDL.Dashboard) {
                    curr = {
                        dashboard: item,
                        vertexMap: {},
                        edges: [],
                    };
                    dashboards[item.getQualifiedID()] = curr;
                } else if (item instanceof HipieDDL.DataSource) {
                    if (item.databomb && databomb[item.id]) {
                        item.comms.databomb(databomb[item.id]);
                    }
                    if (this._visualizeRoxie) {
                        var params = "";
                        item.filter.forEach(function (item) {
                            if (params.length > 0) {
                                params += ", ";
                            }
                            params += item;
                        });
                        params = " (" + params + ")";
                        curr.vertexMap[item.getQualifiedID()] = new Vertex()
                            .class("vertexLabel")
                            .faChar("\uf1c0")
                            .text(item.id + params)
                        ;
                    }
                } else if (item instanceof HipieDDL.Output) {
                    if (this._visualizeRoxie) {
                        curr.vertexMap[item.getQualifiedID()] = new Vertex()
                            .class("vertexLabel")
                            .faChar("\uf0ce")
                            .text(item.id + "\n[" + item.from + "]")
                        ;
                    }
                } else if (item instanceof HipieDDL.Visualization) {
                    if (item.widget) {
                        var newSurface = null;
                        if (item.widget instanceof Surface) {
                            newSurface = item.widget
                                .size({ width: 210, height: 210 })
                            ;
                        } else if (item.widget instanceof TextBox) {
                            newSurface = item.widget;
                        } else {
                            var width = 280;
                            var height = 210;
                            if (item.type === "GRAPH") {
                                width = 800;
                                height = 600;
                            }
                            newSurface = new ResizeSurface()
                                .size({ width: width, height: height })
                                .title(item.title)
                                .content(item.widget)
                            ;
                        }
                        if (newSurface) {
                            item.widgetSurface = newSurface;
                            curr.vertexMap[item.getQualifiedID()] = newSurface;

                            switch (item.type) {
                                case "2DCHART":
                                case "PIE":
                                case "BUBBLE":
                                case "BAR":
                                case "WORD_CLOUD":
                                    newSurface.menu(item.widget._2dChartTypes.concat(item.widget._anyChartTypes).map(function (item) { return item.display; }).sort());
                                    newSurface._menu.click = function (d) {
                                        item.widget
                                            .chart_type(d)
                                            .render()
                                        ;
                                    }
                                    break;
                                case "LINE":
                                    newSurface.menu(item.widget._multiChartTypes.concat(item.widget._anyChartTypes).map(function (item) { return item.display; }).sort());
                                    newSurface._menu.click = function (d) {
                                        item.widget
                                            .chart_type(d)
                                            .render()
                                        ;
                                    }
                                    break;
                                case "CHORO":
                                    newSurface._menu
                                        .data(Palette.rainbow())
                                    ;
                                    newSurface._menu.click = function (d) {
                                        newSurface._content
                                            .paletteID(d)
                                            .render(d)
                                        ;
                                    }
                                    break;
                                case "GRAPH":
                                    newSurface._menu
                                        .data(["Circle", "ForceDirected", "ForceDirected2", "Hierarchy"])
                                    ;
                                    newSurface._menu.click = function (d) {
                                        newSurface._content
                                            .layout(d)
                                        ;
                                    }
                                    break;
                            }
                        }
                    }
                }
            }
        });

        function addEdge(curr, sourceID, targetID, sourceMarker, targetMarker, text) {
            sourceMarker = sourceMarker || "";
            targetMarker = targetMarker || "";
            text = text || "";
            if (sourceID && targetID && curr.vertexMap[sourceID] && curr.vertexMap[targetID]) {
                curr.edges.push(new Edge()
                    .sourceVertex(curr.vertexMap[sourceID])
                    .targetVertex(curr.vertexMap[targetID])
                    .sourceMarker(sourceMarker)
                    .targetMarker(targetMarker)
                    .text(text)
                );
            } else {
                if (!curr.vertexMap[sourceID]) {
                    console.log("Unknown Vertex:  " + sourceID);
                }
                if (!curr.vertexMap[targetID]) {
                    console.log("Unknown Vertex:  " + targetID);
                }
            }
        };

        curr = null;
        marshaller.accept({
            _visualizeRoxie: visualizeRoxie,
            visit: function (item) {
                if (item instanceof HipieDDL.Dashboard) {
                    curr = dashboards[item.getQualifiedID()];
                } else if (item instanceof HipieDDL.DataSource) {
                } else if (item instanceof HipieDDL.Output) {
                    if (this._visualizeRoxie) {
                        addEdge(curr, item.dataSource.getQualifiedID(), item.getQualifiedID(), "circleFoot", "circleHead");
                    }
                } else if (item instanceof HipieDDL.Visualization) {
                    if (this._visualizeRoxie) {
                        if (item.source.getDatasource()) {
                            addEdge(curr, item.getQualifiedID(), item.source.getDatasource().getQualifiedID(), "", "arrowHead", "update");
                        }
                        if (item.source.getOutput()) {
                            addEdge(curr, item.source.getOutput().getQualifiedID(), item.getQualifiedID(), "", "arrowHead", "notify");
                        }
                    }

                    item.onSelect.getUpdatesVisualizations().forEach(function (vizItem) {
                        addEdge(curr, item.getQualifiedID(), vizItem.getQualifiedID(), undefined, "arrowHead", "on Select");
                    });
                }
            }
        });
        return dashboards;
    };

    var PERSIST_VER = 2;
    function Graph() {
        GraphWidget.call(this);
        this._class = "marshaller_Graph";

        this._design_mode = false;
        this._dashboards = [];
        this.graphAttributes = ["snapToGrid", "showEdges"];
        this.widgetAttributes = ["layout", "chartType", "palette", "title", "columns", "data"];
    };
    Graph.prototype = Object.create(GraphWidget.prototype);
    Graph.prototype.publish("ddl_url", "", "string", "DDL URL");
    Graph.prototype.publish("databomb", "", "string", "Data Bomb");
    Graph.prototype.publish("proxy_mappings", [], "array", "Proxy Mappings");
    Graph.prototype.publish("visualize_roxie", false, "boolean", "Show Roxie Data Sources");

    Graph.prototype.publish()
    
    Graph.prototype.testData = function () {
        this.ddl_url("http://10.173.147.1:8002/WsEcl/submit/query/roxie/drealeed_testaddressclean.ins002_service/json");
        return this;
    };

    Graph.prototype.design_mode = function (_) {
        if (!arguments.length) return this._design_mode;
        this._design_mode = _;
        this
            .showEdges(this._designMode)
            .snapToGrid(this._designMode ? 12 : 0)
            .allowDragging(this._designMode)
        ;
        if (this._data.vertices) {
            this._data.vertices.forEach(function (row) {
                row.show_title(this._design_mode)
                    .render()
                ;
            }, this);
        }
        return this;
    };

    Graph.prototype.dashboards = function (_) {
        if (!arguments.length) return this._dashboards;
        this._dashboards = _;
        return this;
    };

    Graph.prototype.title = function () {
        var retVal = "";
        this._dashboards.forEach(function (item) {
            if (retVal) {
                retVal += ", ";
            }
            retVal += item.dashboard.title;
        });
        return retVal;
    };

    Graph.prototype.renderDashboards = function (restorePersist) {
        this.data({ vertices: [], edges: []});
        var context = this;
        var vertices = [];
        var edges = [];
        for (var key in this._dashboards) {
            for (var vm_key in this._dashboards[key].vertexMap) {
                vertices.push(this._dashboards[key].vertexMap[vm_key]);
            }
            edges = edges.concat(this._dashboards[key].edges);
        }
        this.data({ vertices: vertices, edges: edges });
        var loadResult = restorePersist ? this.load() : { changed: false, dataChanged: false };
        if (loadResult.changed) {
            this.layout("");
        }
        if (!loadResult.dataChanged) {
            this.fetchData();
        }
        return this;
    };

    Graph.prototype.fetchData = function () {
        for (var key in this._dashboards) {
            var dashboard = this._dashboards[key].dashboard;
            for (var key in dashboard.datasources) {
                dashboard.datasources[key].fetchData({}, true);
            }
        }
        return this;
    };

    Graph.prototype.checksum = function (s) {
        var hash = 0,
        strlen = s.length,
        i,
        c;
        if ( strlen === 0 ) {
            return hash;
        }
        for ( i = 0; i < strlen; i++ ) {
            c = s.charCodeAt( i );
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    };

    Graph.prototype.calcHash = function () {
        var context = this;
        var hash = PERSIST_VER;
        for (var key in this._dashboards) {
            var currDashboard = this._dashboards[key].dashboard;
            currDashboard.accept({
                visit: function (item) {
                    if (item instanceof HipieDDL.Visualization) {
                        hash += context.checksum(item.getQualifiedID());
                    }
                }
            });
        }
        return hash;
    },

    Graph.prototype.clear = function () {
        localStorage.setItem("Graph_" + this.calcHash(), "");
    };

    Graph.prototype.serialize = function (graphAttributes, widgetAttributes) {
        graphAttributes = graphAttributes || [];
        widgetAttributes = widgetAttributes || [];

        var state = {};
        state["zoom"] = {
            translation: this.zoom.translate(),
            scale: this.zoom.scale()
        };
        graphAttributes.forEach(function (attr) {
            if (this[attr]) {
                state[attr] = this[attr]();
            }
        }, this);
        for (var key in this._dashboards) {
            var currDashboard = this._dashboards[key].dashboard;
            var currDashboardID = currDashboard.getQualifiedID();
            state[currDashboardID] = {};
            currDashboard.accept({
                visit: function (item) {
                    if (item instanceof HipieDDL.Visualization) {
                        if (item.widgetSurface) {
                            var vizState = {
                                pos: item.widgetSurface.pos(),
                                size: item.widgetSurface.size()
                            };
                            widgetAttributes.forEach(function (attr) {
                                if (item.widget[attr]) {
                                    vizState[attr] = item.widget[attr]();
                                } else if (item.widgetSurface[attr]) {
                                    vizState[attr] = item.widgetSurface[attr]();
                                }
                            });
                            state[currDashboardID][item.getQualifiedID()] = vizState;
                        }
                    }
                }
            });
        }
        return JSON.stringify(state);
    };

    Graph.prototype.save = function () {
        localStorage.setItem("Graph_" + this.calcHash(), this.serialize(this.graphAttributes, this.widgetAttributes));
    };

    Graph.prototype.deserialize = function (state, graphAttributes, widgetAttributes) {
        graphAttributes = graphAttributes || [];
        widgetAttributes = widgetAttributes || [];

        var changed = false;
        var dataChanged = false;

        graphAttributes.forEach(function (attr) {
            if (this[attr] && state[attr] !== undefined) {
                this[attr](state[attr]);
            }
        }, this);
        if (state.zoom) {
            this.setZoom(state.zoom.translation, state.zoom.scale);
            changed = true;
        }

        for (var key in this._dashboards) {
            var currDashboard = this._dashboards[key].dashboard;
            var currDashboardID = currDashboard.getQualifiedID();
            currDashboard.accept({
                visit: function (item) {
                    if (item instanceof HipieDDL.Visualization && state[currDashboardID] && state[currDashboardID][item.getQualifiedID()]) {
                        var vizState = state[currDashboardID][item.getQualifiedID()];
                        item.widgetSurface
                            .pos(vizState.pos)
                            .size(vizState.size)
                        ;
                        changed = true;
                        widgetAttributes.forEach(function (attr) {
                            if (item.widget[attr] && vizState[attr] !== undefined) {
                                item.widget[attr](vizState[attr]);
                                if (attr === "data") {
                                    dataChanged = true;
                                }
                            } else if (item.widgetSurface[attr] && vizState[attr]) {
                                item.widgetSurface[attr](vizState[attr]);
                            };
                        });
                    }
                }
            });
        }
        return { changed: changed, dataChanged: dataChanged };
    };

    Graph.prototype.load = function () {
        var retVal = { changed: false, dataChanged: false };
        var stateJSON = localStorage.getItem("Graph_" + this.calcHash());
        if (stateJSON) {
            retVal = this.deserialize(JSON.parse(stateJSON), this.graphAttributes, this.widgetAttributes);
        }
        return retVal;
    }

    Graph.prototype.enter = function (domNode, element) {
        GraphWidget.prototype.enter.apply(this, arguments);
        element.classed("graph_Graph", true);
    };

    Graph.prototype.update = function (domNode, element) {
        GraphWidget.prototype.update.apply(this, arguments);
    };

    Graph.prototype.render = function (callback) {
        if (this._ddl_url === "" || this._ddl_url === this._prev_ddl_url) {
            return GraphWidget.prototype.render.apply(this, arguments);
        }
        this._prev_ddl_url = this._ddl_url;
        var marshaller = new HipieDDL.Marshaller().proxyMappings(this._proxy_mappings);
        var context = this;
        var args = arguments;
        if (this._ddl_url[0] === "[" || this._ddl_url[0] === "{") {
            marshaller.parse(this._ddl_url, function () {
                postParse();
            });
        } else {
            marshaller.url(this._ddl_url, function () {
                postParse();
            });
        }
        function postParse() {
            var dashboards = createGraphData(marshaller, context._databomb, context._visualize_roxie);
            context.dashboards(dashboards);
            context
                .shrinkToFitOnLayout(true)
                .layout("Hierarchy")
                .renderDashboards(true)
            ;
            GraphWidget.prototype.render.call(context, function (widget) {
                if (callback) {
                    callback(widget);
                }
            });
        }
        return this;
    }

    return Graph;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('marshaller/HTML.js',["d3/d3", "../layout/Grid", "./HipieDDL", "../layout/Surface", "../layout/Cell"], factory);
    } else {
        root.marshaller_HTML = factory(root.d3, root.layout_Grid, root.marshaller_HipieDDL, root.layout_Surface, root.layout_Cell);
    }
}(this, function (d3, Grid, HipieDDL, Surface, Cell) {
    function HTML() {
        Grid.call(this);
        this._class = "marshaller_HTML";
    };
    HTML.prototype = Object.create(Grid.prototype);

    HTML.prototype.publish("ddl_url", "", "string", "DDL URL");
    HTML.prototype.publish("proxy_mappings", [], "array", "Proxy Mappings");
    HTML.prototype.publish("databomb", "", "string", "Data Bomb");

    HTML.prototype.testData = function () {
        //this.ddl_url("http://10.239.227.24:8010/WsWorkunits/WUResult?Wuid=W20150311-200229&ResultName=leeddx_issue_652_nestedfunctions_Comp_Ins002_DDL");
        return this;
    };

    HTML.prototype.content = function () {
        return Grid.prototype.content.apply(this, arguments);
    };

    HTML.prototype.setContent = function (row, col, widget, title, rowSpan, colSpan) {
        return Grid.prototype.setContent.apply(this, arguments);
    };

    HTML.prototype.enter = function (domNode, element) {
        Grid.prototype.enter.apply(this, arguments);
    };

    function createGraphData(marshaller, databomb) {
        if (databomb instanceof Object) {
        } else if (databomb){
            databomb = JSON.parse(databomb);
        }
        var curr = null;
        var dashboards = {};
        marshaller.accept({
            visit: function (item) {
                if (item instanceof HipieDDL.Dashboard) {
                    curr = {
                        dashboard: item,
                        visualizations: [],
                    };
                    dashboards[item.getQualifiedID()] = curr;
                } else if (item instanceof HipieDDL.DataSource) {
                    if (item.databomb && databomb[item.id]) {
                        item.comms.databomb(databomb[item.id]);
                    }
                } else if (item instanceof HipieDDL.Output) {
                } else if (item instanceof HipieDDL.Visualization) {
                    if (item.widget) {
                        curr.visualizations.push(item);
                    }
                }
            }
        });
        return dashboards;
    };

    HTML.prototype.render = function (callback) {
        if (this._ddl_url === "" || this._ddl_url === this._prev_ddl_url) {
            return Grid.prototype.render.apply(this, arguments);
        }

        this._prev_ddl_url = this._ddl_url;
        var marshaller = new HipieDDL.Marshaller().proxyMappings(this._proxy_mappings);
        var context = this;
        var args = arguments;
        //this.clearContent();
        if (this._ddl_url[0] === "[" || this._ddl_url[0] === "{") {
            marshaller.parse(this._ddl_url, function () {
                postParse();
            });
        } else {
            marshaller.url(this._ddl_url, function () {
                postParse();
            });
        }
        function postParse() {
            var dashboards = createGraphData(marshaller, context._databomb);
            var row = 0;
            for (var key in dashboards) {
                var cellRow = 0;
                var cellCol = 0;
                var maxCol = Math.floor(Math.sqrt(dashboards[key].visualizations.length));
                dashboards[key].visualizations.forEach(function (viz, idx) {
                    if (idx && (idx % maxCol === 0)) {
                        cellRow++;
                        cellCol = 0;
                    }
                    viz.widget.size({ width: 0, height: 0 });
                    var existingWidget = context.getContent(viz.widget._id);
                    if (existingWidget) {
                        viz.setWidget(existingWidget, true);
                    } else {
                        var d = 0;
                        context.setContent(cellRow, cellCol, viz.widget, viz.title);
                    }
                    cellCol++;
                });
                for (var key2 in dashboards[key].dashboard.datasources) {
                    dashboards[key].dashboard.datasources[key2].fetchData({}, true);
                }
            }
            Grid.prototype.render.call(context, function (widget) {
                if (callback) {
                    callback(widget);
                }
            });
        }
        return this;
    }

    return HTML;
}));

