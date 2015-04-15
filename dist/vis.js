
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Widget.js',["d3/d3"], factory);
    } else {
        root.Widget = factory(root.d3);
    }
}(this, function (d3) {
    var widgetID = 0;
    var widgetMeta = {};
    function Widget() {
        this._id = "_w" + widgetID++;
        this._class = "";

        this._columns = [];
        this._data = [];
        this._pos = { x: 0, y: 0 };
        this._size = { width: 0, height: 0 };
        this._scale = 1;

        this._target = null;
        this._parentElement = null;
        this._parentWidget = null;

        this._element = d3.select();

        this._watchArr = [];

        this._renderCount = 0;
    };
    Widget.prototype.ieVersion = (function () {
        var ua = navigator.userAgent, tem,
            M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return parseFloat(tem[1]);
        }
        if (/msie/i.test(M[1])) {
            return parseFloat(M[2]);
        }
        return null;
    })();
    Widget.prototype.isIE = Widget.prototype.ieVersion !== null;
    Widget.prototype.svgMarkerGlitch = Widget.prototype.isIE && Widget.prototype.ieVersion <= 12;
    Widget.prototype.MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver || function (callback) {
        //  Just enough for HTMLOverlay and C3  ---
        this.callback = callback;
        this.listeners = [];

        var MutationListener = function (callback, domNode, type) {
            this.callback = callback;
            this.domNode = domNode;
            this.type = type;
        };
        MutationListener.prototype = {
            handleEvent: function (evt) {
                var mutation = {
                    type: this.type,
                    target: this.domNode,
                    addedNodes: [],
                    removedNodes: [],
                    previousSibling: evt.target.previousSibling,
                    nextSibling: evt.target.nextSibling,
                    attributeName: null,
                    attributeNamespace: null,
                    oldValue: null
                }
                this.callback([mutation]);
            }
        };

        this.observe = function (domNode, config) {
            if (config.attributes) {
                var listener = new MutationListener(this.callback, domNode, "attributes");
                this.listeners.push(listener);
                domNode.addEventListener('DOMAttrModified', listener, true);
            }

            if (config.characterData) {
                var listener = new MutationListener(this.callback, domNode, "characterData");
                this.listeners.push(listener);
                domNode.addEventListener('DOMCharacterDataModified', listener, true);
            }

            if (config.childList) {
                var listener = new MutationListener(this.callback, domNode, "childList");
                this.listeners.push(listener);
                domNode.addEventListener('DOMNodeInserted', listener, true);
                domNode.addEventListener('DOMNodeRemoved', listener, true);
            }
        }

        this.disconnect = function () {
            this.listeners.forEach(function (item) {
                switch (item.type) {
                    case "attributes":
                        item.domNode.removeEventListener('DOMAttrModified', item, true);
                        break;
                    case "characterData":
                        item.domNode.removeEventListener('DOMCharacterDataModified', item, true);
                        break;
                    case "childList":
                        item.domNode.removeEventListener('DOMNodeRemoved', item, true);
                        item.domNode.removeEventListener('DOMNodeInserted', item, true);
                        break;
                }
            });
            this.listeners = [];
        }
    };
    if (!window.MutationObserver) {
        window.MutationObserver = Widget.prototype.MutationObserver;
    }

    Widget.prototype.implements = function (source) {
        for (var prop in source) {
            if (this[prop] === undefined && source.hasOwnProperty(prop)) {
                this[prop] = source[prop];
            }
        }
    };

    // Serialization  ---
    Widget.prototype.publish = function (id, defaultValue, type, description, set, ext) {
        if (this["__meta_" + id] !== undefined) {
            throw id + " is already published."
        }
        this["__meta_" + id] = {
            id: id,
            type: type,
            defaultValue: defaultValue,
            description: description,
            set: set,
            ext: ext || {}
        }
        this[id] = function (_) {
            if (!arguments.length) return this["_" + id];
            switch (type) {
                case "set":
                    if (!set || set.indexOf(_) < 0) {
                        console.log("Invalid value for '" + id + "':  " + _);
                    }
                    break;
                case "html-color":
                    var litmus = 'red';
                    var d = document.createElement('div');
                    d.style.color=litmus;
                    d.style.color=_;
                    //Element's style.color will be reverted to litmus or set to '' if an invalid color is given
                    if( _ !== litmus && (d.style.color === litmus || d.style.color === '')){
                        console.log("Invalid value for '" + id + "':  " + _);
                    }
                    break;
                case "boolean":
                    _ = Boolean(_);
                    break;
                case "number":
                    _ = Number(_);
                    break;
                case "string":
                    _ = String(_);
                    break;
                case "array":
                    if (!(_ instanceof Array)) {
                        console.log("Invalid value for '" + id);
                    }
                    break;
            }
            this.broadcast(id, _, this["_" + id]);
            this["_" + id] = _;
            return this;
        };
        this[id + "_modified"] = function () {
            return this["_" + id] !== defaultValue;
        }
        this[id + "_reset"] = function () {
            this["_" + id] = defaultValue;
        }
        this["_" + id] = defaultValue;
    };

    Widget.prototype.publishWidget = function (prefix, WidgetType, id) {
        for (var key in WidgetType.prototype) {
            if (key.indexOf("__meta") === 0) {
                var publishItem = WidgetType.prototype[key];
                this.publishProxy(prefix + "_" + publishItem.id, id, publishItem.method || publishItem.id)
            }
        }
    };

    Widget.prototype.publishProxy = function (id, proxy, method, defaultValue) {
        method = method || id;
        if (this["__meta_" + id] !== undefined) {
            throw id + " is already published."
        }
        this["__meta_" + id] = {
            id: id,
            type: "proxy",
            proxy: proxy,
            method: method,
            defaultValue: defaultValue
        }
        this[id] = function (_) {
            if (!arguments.length) return !defaultValue || this[id + "_modified"]() ? this[proxy][method]() : defaultValue;
            if (defaultValue && _ === defaultValue) {
                this[proxy][method + "_reset"]();
            } else {
                this[proxy][method](_);
            }
            return this;
        };
        this[id + "_modified"] = function (_) {
            return this[proxy][method + "_modified"]() && (!defaultValue || this[proxy][method]() !== defaultValue);
        }
        this[id + "_reset"] = function () {
            this[proxy][method + "_reset"]();
        }
    };

    Widget.prototype.watch = function (func) {
        var context = this;
        var idx = this._watchArr.push(func) - 1;
        return {
            remove: function () {
                delete context._watchArr[idx];
            }
        };
    };

    Widget.prototype.broadcast = function (key, newVal, oldVal) {
        this._watchArr.forEach(function (func) {
            if (func) {
                setTimeout(function () {
                    func(key, newVal, oldVal);
                }, 0);
            }
        });
    };

    //  Implementation  ---
    Widget.prototype.id = function (_) {
        if (!arguments.length) return this._id;
        this._id = _;
        return this;
    };

    Widget.prototype.class = function (_) {
        if (!arguments.length) return this._class;
        this._class = _;
        return this;
    };

    Widget.prototype.columns = function (_) {
        if (!arguments.length) return this._columns;
        this._columns = _;
        return this;
    };

    Widget.prototype.data = function (_) {
        if (!arguments.length) return this._data;
        this._data = _;
        return this;
    };

    Widget.prototype.cloneData = function () {
        return this._data.map(function (row) { return row.slice(0); });
    };

    Widget.prototype.rowToObj = function (row) {
        var retVal = {};
        if (row.length !== this._columns.length) {
            throw "Columns and row do not match";
        }
        this._columns.forEach(function(col, idx) {
            retVal[col] = row[idx];
        });
        return retVal;
    };

    Widget.prototype.pos = function (_) {
        if (!arguments.length) return this._pos;
        this._pos = _;
        if (this._overlayElement) {
            this._overlayElement
                .attr("transform", "translate(" + _.x + "," + _.y + ")scale(" + this._scale + ")")
            ;
        }
        return this;
    };

    Widget.prototype.x = function (_) {
        if (!arguments.length) return this._pos.x;
        this.pos({ x: _, y: this._pos.y })
        return this;
    };

    Widget.prototype.y = function (_) {
        if (!arguments.length) return this._pos.y;
        this.pos({ x: this._pos.x, y: _ })
        return this;
    };

    Widget.prototype.size = function (_) {
        if (!arguments.length) return this._size;
        this._size = _;
        if (this._overlayElement) {
            this._overlayElement
                .attr("width", _.width)
                .attr("height", _.height)
            ;
        }
        return this;
    };

    Widget.prototype.width = function (_) {
        if (!arguments.length) return this._size.width;
        this.size({ width: _, height: this._size.height })
        return this;
    };

    Widget.prototype.height = function (_) {
        if (!arguments.length) return this._size.height;
        this.size({ width: this._size.width, height: _ })
        return this;
    };

    Widget.prototype.resize = function (size, delta) {
        delta = delta || { width: 0, height: 0 };
        var width, height;
        if (size && size.width && size.height) {
            width = size.width;
            height = size.height;
        } else {
            var style = window.getComputedStyle(this._target, null);
            width = parseFloat(style.getPropertyValue("width")) - delta.width;
            height = parseFloat(style.getPropertyValue("height")) - delta.height;
        }
        this.size({
            width: width,
            height: height
        });
        return this;
    };

    Widget.prototype._scrollBarWidth = null;
    Widget.prototype.getScrollbarWidth = function () {
        if (Widget.prototype._scrollBarWidth === null) {
            var outer = document.createElement("div");
            outer.style.visibility = "hidden";
            outer.style.width = "100px";
            outer.style.msOverflowStyle = "scrollbar";

            document.body.appendChild(outer);

            var widthNoScroll = outer.offsetWidth;
            outer.style.overflow = "scroll";

            var inner = document.createElement("div");
            inner.style.width = "100%";
            outer.appendChild(inner);

            var widthWithScroll = inner.offsetWidth;

            outer.parentNode.removeChild(outer);

            Widget.prototype._scrollBarWidth = widthNoScroll - widthWithScroll;
        }
        return Widget.prototype._scrollBarWidth;
    };

    Widget.prototype.scale = function (_) {
        if (!arguments.length) return this._scale;
        this._scale = _;
        if (this._overlayElement) {
            this._overlayElement
                .attr("transform", "translate(" + _.x + "," + _.y + ")scale(" + this._scale + ")")
            ;
        }
        return this;
    };

    Widget.prototype.visible = function (_) {
        if (!arguments.length) return this._visible;
        this._visible = _;
        if (this._parentElement) {
            this._parentElement.style("visibility", this._visible ? null : "hidden");
        }
        return this;
    };

    Widget.prototype.display = function (_) {
        if (!arguments.length) return this._display;
        this._display = _;
        if (this._element) {
            this._element.style("display", this._display ? null : "none");
        }
        return this;
    };

    Widget.prototype.calcSnap = function (snapSize) {
        function snap(x, gridSize) {
            function snapDelta(x, gridSize) {
                var dx = x % gridSize;
                if (Math.abs(dx) > gridSize - Math.abs(dx)) {
                    dx = (gridSize - Math.abs(dx)) * (dx < 0 ? 1 : -1);
                }
                return dx;
            }
            return x - snapDelta(x, gridSize);
        }
        var l = snap(this._pos.x - this._size.width / 2, snapSize);
        var t = snap(this._pos.y - this._size.height / 2, snapSize);
        var r = snap(this._pos.x + this._size.width / 2, snapSize);
        var b = snap(this._pos.y + this._size.height / 2, snapSize);
        var w = r - l;
        var h = b - t;
        return [{ x: l + w /2, y: t + h / 2 }, { width: w, height: h }];
    };

    //  DOM/SVG Node Helpers  ---
    Widget.prototype.toWidget = function (domNode) {
        if (!domNode) {
            return null;
        }
        var element = d3.select(domNode);
        if (element) {
            var widget = element.datum();
            if (widget) {
                return widget;
            }
        }
        return null;
    };

    Widget.prototype.locateParentWidget = function (domNode) {
        if (!domNode) {
            return null;
        }
        var widget = this.toWidget(domNode);
        if (widget) {
            return widget;
        }
        return this.locateParentWidget(domNode.parentNode);
    };

    Widget.prototype.locateSVGNode = function (domNode) {
        if (!domNode) {
            return null;
        }
        if (domNode.tagName === "svg") {
            return domNode;
        }
        return this.locateSVGNode(domNode.parentNode);
    };

    Widget.prototype.locateOverlayNode = function () {
        var widget = this.locateParentWidget(this._target);
        while (widget) {
            if (widget._parentOverlay) {
                return widget._parentOverlay;
            }
            widget = this.locateParentWidget(widget._target.parentNode);
        }
        return null;
    };

    Widget.prototype.getAbsolutePos = function (domNode, w, h) {
        var root = this.locateSVGNode(domNode);
        if (!root) {
            return null;
        }
        var pos = root.createSVGPoint();
        var ctm = domNode.getCTM();
        pos = pos.matrixTransform(ctm);
        var retVal = {
            x: pos.x,
            y: pos.y
        };
        if (w !== undefined && h !== undefined) {
            var size = root.createSVGPoint();
            size.x = w;
            size.y = h;
            size = size.matrixTransform(ctm);
            retVal.width = size.x - pos.x;
            retVal.height = size.y - pos.y;
        }
        return retVal;
    };

    Widget.prototype.hasOverlay = function () {
        return this._overlayElement;
    };

    Widget.prototype.syncOverlay = function () {
        if (this._size.width && this._size.height) {
            var newPos = this.getAbsolutePos(this._overlayElement.node(), this._size.width, this._size.height);
            if (newPos && (this.oldPos === null || this.oldPos === undefined || newPos.x !== this.oldPos.x || newPos.y !== this.oldPos.y || newPos.width !== this.oldPos.width || newPos.height !== this.oldPos.height)) {
                var xScale = newPos.width / this._size.width;
                var yScale = newPos.height / this._size.height;
                this._parentElement
                    .style({
                        left: newPos.x - (newPos.width / xScale) / 2 + "px",
                        top: newPos.y - (newPos.height / yScale) / 2 + "px",
                        width: newPos.width / xScale + "px",
                        height: newPos.height / yScale + "px"
                    })
                ;
                var transform = "scale(" + xScale + "," + yScale + ")";
                this._parentElement
                    .style("transform", transform)
                    .style("-moz-transform", transform)
                    .style("-ms-transform", transform)
                    .style("-webkit-transform", transform)
                    .style("-o-transform", transform)
                ;
            }
            this.oldPos = newPos;
        }
    };

    Widget.prototype.element = function () {
        return this._element;
    };

    Widget.prototype.node = function () {
        return this._element.node();
    };

    //  Render  ---
    Widget.prototype.render = function (callback) {
        if (!this._parentElement)
            return this;

        if (!this._tag)
            throw "No DOM tag specified";

        var elements = this._parentElement.selectAll("#" + this._id).data([this], function (d) { return d._id; });
        elements.enter().append(this._tag)
            .classed(this._class, true)
            .attr("id", this._id)
            //.attr("opacity", 0.50)  //  Uncomment to debug position offsets  ---
            .each(function (context) {
                context._element = d3.select(this);
                context.enter(this, context._element);
            })
        ;
        elements
            .each(function (context) {
                context.update(this, context._element);
                context._element.attr("transform", function (d) { return "translate(" + context._pos.x + "," + context._pos.y + ")scale(" + context._scale + ")"; });
            })
        ;
        elements.exit()
            .each(function exit(context) {
                context.exit(this, context._element);
            })
            .remove()
        ;
        this._renderCount++;

        if (callback) {
            callback(this);
        }

        return this;
    };

    Widget.prototype.enter = function (domeNode, element, d) { };
    Widget.prototype.update = function (domeNode, element, d) { };
    Widget.prototype.exit = function (domeNode, element, d) { };

    //  Util  ---
    Widget.prototype.debounce = function (func, threshold, execAsap) {
        return function debounced() {
            var obj = this, args = arguments;
            function delayed() {
                if (!execAsap)
                    func.apply(obj, args);
                obj.timeout = null;
            };
            if (obj.timeout)
                clearTimeout(obj.timeout);
            else if (execAsap)
                func.apply(obj, args);
            obj.timeout = setTimeout(delayed, threshold || 100);
        }
    };

    return Widget;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Transition.js',[], factory);
    } else {
        root.Entity = factory();
    }
}(this, function () {
    function Transition(widget) {
        this._widget = widget;
        this._duration = 250;
        this._delay = 0;
        this._ease = "cubic-in-out";
    };

    Transition.prototype.duration = function (_) {
        if (!arguments.length) return this._duration;
        this._duration = _;
        return this._widget;
    };

    Transition.prototype.delay = function (_) {
        if (!arguments.length) return this._delay;
        this._delay = _;
        return this._widget;
    };

    Transition.prototype.ease = function (_) {
        if (!arguments.length) return this._ease;
        this._ease = _;
        return this._widget;
    };

    Transition.prototype.apply = function (selection) {
        if (this._duration || this._delay) {
            return selection.transition()
                .duration(this._duration)
                .delay(this._delay)
                .ease(this._ease)
            ;
        }
        return selection;
    };

    return Transition;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/HTMLWidget.js',["./Widget", "./Transition", "d3/d3"], factory);
    } else {
        root.HTMLWidget = factory(root.Widget, root.Transition, root.d3);
    }
}(this, function (Widget, Transition, d3) {
    function HTMLWidget() {
        Widget.call(this);
    };
    HTMLWidget.prototype = Object.create(Widget.prototype);

    HTMLWidget.prototype.calcFrameWidth = function (element) {
        var retVal = parseFloat(element.style("padding-left"))
            + parseFloat(element.style("padding-right"))
            + parseFloat(element.style("margin-left"))
            + parseFloat(element.style("margin-right"))
            + parseFloat(element.style("border-left-width"))
            + parseFloat(element.style("border-right-width"))
        ;
        return retVal;
    };

    HTMLWidget.prototype.calcWidth = function (element) {
        return parseFloat(element.style("width")) - this.calcFrameWidth(element);
    };

    HTMLWidget.prototype.calcFrameHeight = function (element) {
        var retVal = parseFloat(element.style("padding-top"))
            + parseFloat(element.style("padding-bottom"))
            + parseFloat(element.style("margin-top"))
            + parseFloat(element.style("margin-bottom"))
            + parseFloat(element.style("border-top-width"))
            + parseFloat(element.style("border-bottom-width"))
        ;
        return retVal;
    };

    HTMLWidget.prototype.calcHeight = function (element) {
        return parseFloat(element.style("height")) + this.calcFrameHeight(element);
    };

    HTMLWidget.prototype.clientWidth = function () {
        return this._size.width - this.calcFrameWidth(this._element);
    };

    HTMLWidget.prototype.clientHeight = function () {
        return this._size.height - this.calcFrameHeight(this._element);
    };

    HTMLWidget.prototype.resize = function (size) {
        var retVal = Widget.prototype.resize.apply(this, arguments);
        this._parentElement
            .style("width", this._size.width + "px")
            .style("height", this._size.height + "px")
        ;
        return retVal;
    };

    //  Properties  ---
    HTMLWidget.prototype.target = function (_) {
        if (!arguments.length) return this._target;
        if (this._target && _) {
            throw "Target can only be assigned once."
        }
        this._target = _;

        //  Target is a DOM Node ID ---
        if (typeof (this._target) === 'string' || this._target instanceof String) {
            this._target = document.getElementById(this._target);
        }

        if (this._target instanceof SVGElement) {
            //  Target is a SVG Node, so create an item in the Overlay and force it "over" the overlay element (cough)  ---
            var overlay = this.locateOverlayNode();
            this._parentElement = overlay.append("div")
                .style({
                    position: "absolute",
                    top: 0,
                    left: 0,
                    overflow: "hidden"
                })
            ;
            this._overlayElement = d3.select(this._target);

            var context = this;
            this.oldPos = null;
            this.observer = new this.MutationObserver(function (mutation) {
                context.syncOverlay();
            });

            var domNode = this._overlayElement.node();
            while (domNode) {
                this.observer.observe(domNode, { attributes: true });
                domNode = domNode.parentNode
            }
        } else if (this._target) {
            this._parentElement = d3.select(this._target);
            if (!this._size.width && !this._size.height) {
                var width = parseFloat(this._parentElement.style("width"));
                var height = parseFloat(this._parentElement.style("height"));
                this.size({
                    width: width,
                    height: height
                });
            }
            this._parentElement = d3.select(this._target).append("div");
        } else {
            this.exit();
        }
        return this;
    };

    HTMLWidget.prototype.exit = function (domeNode, element, d) {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.oldPos = null;
        if (this._parentElement) {
            this._parentElement.remove();
        }
        Widget.prototype.exit.apply(this, arguments);
    };

    return HTMLWidget;
}));

define('css',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Common.js',["d3/d3", "c3/c3", "../common/HTMLWidget", "css!c3/c3"], factory);
    } else {
        root.Pie = factory(root.d3, root.c3, root.HTMLWidget);
    }
}(this, function (d3, c3, HTMLWidget) {
    function Common(target) {
        HTMLWidget.call(this);

        this._tag = "div";
        this._class = "c3_Common";
        this._type = "unknown";
        var context = this;
        this._config = {
            axis: {
            },
            legend: {
                position: 'bottom',
                show: true
            },
            data: {
                columns: [],
                rows: []
            }
        };
    };
    Common.prototype = Object.create(HTMLWidget.prototype);

    Common.prototype.publish("legendPosition", "right", "set", "Legend Position", ["bottom", "right"]);

    Common.prototype.type = function (_) {
        if (!arguments.length) return this._type;
        this._type = _;
        return this;
    };

    Common.prototype.getC3Series = function() {
        return this._columns.filter(function (d, i) { return i > 0;});
    };
 
    Common.prototype.getC3Rows = function () {
        var retVal = [this._columns.filter(function (item, idx) { return idx > 0; })].concat(this._data.map(function (row) {
            return row.filter(function (cell, idx) {
                return idx > 0;
            })
        }));
        return retVal;
    };

    Common.prototype.getC3Categories = function () {
        var retVal = this._data.map(function (row, idx) { return row[0]; });
        return retVal;
    };

    Common.prototype.getC3Column = function (colNum) {
        var retVal = [this._columns[colNum]].concat(this._data.map(function (row, idx) { return row[colNum]; }));
        return retVal;
    };

    Common.prototype.getC3Columns = function (total) {
        if (!this._data.length) {
            return [];
        }
        total = total || this._columns.length;
        var retVal = [];
        for (var i = 1; i < total; ++i) {
            retVal.push(this.getC3Column(i));
        }
        return retVal;
    };

    Common.prototype.enter = function (domNode, element) {
        HTMLWidget.prototype.enter.apply(this, arguments);
        element.style("overflow", "hidden");
        this._config.size = {
            width: this.width(),
            height: this.height()
        };
        this._config.data.type = this._type;
        this._config.legend = {
            position: this._legendPosition
        };
        this._config.bindto = element.append("div").datum(null);
        this.c3Chart = c3.generate(this._config);
    };

    Common.prototype.update = function (domNode, element) {
        HTMLWidget.prototype.update.apply(this, arguments);

        this.c3Chart.resize({
            width: this.width(),
            height: this.height()
        });
    };

    return Common;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Palette.js',["d3/d3", "lib/colorbrewer/colorbrewer"], factory);
    } else {
        root.Entity = factory(root.d3);
    }
}(this, function (d3) {
    var d3Ordinal = [
        "category10", "category20", "category20b", "category20c"
    ];
    var brewerOrdinal = [
        "Accent", "Dark2", "Paired", "Pastel1", "Pastel2", "Set1", "Set2", "Set3"
    ];
    var hpccOrdinal = [
        "hpcc10", "hpcc20"
    ];

    var ordinalCache = {};

    function fetchOrdinalItem(id, colors) {
        if (!id) return palette_ordinal();
        var retVal = ordinalCache[id];
        if (!retVal) {
            retVal = palette_ordinal(id, colors);
            ordinalCache[id] = retVal;
        }
        return retVal;
    };

    function palette_ordinal(id, colors) {
        if (!id) return ["default"].concat(d3Ordinal.concat(brewerOrdinal).concat(hpccOrdinal));
        var id = id;
        var scale = null;
        var colors = colors;

        if (colors) {
            scale = d3.scale.ordinal().range(colors);
        } else {
            if (d3Ordinal.indexOf(id) >= 0) {
                scale = new d3.scale[id]();
            } else if (hpccOrdinal.indexOf(id) >= 0) {
                var newColors = []
                switch (id) {
                    case "hpcc10":
                        var colors = palette_ordinal("default").colors();
                        newColors = colors.filter(function (item, idx) {
                            if (idx % 2) {
                                return true;
                            }
                            return false;
                        });
                        break;
                    case "hpcc20":
                        newColors = palette_ordinal("category10").colors().concat(palette_ordinal("hpcc10").colors());
                        break;
                }
                scale = d3.scale.ordinal().range(newColors);
            } else if (brewerOrdinal.indexOf(id) > 0) {
                var largestPalette = 12;
                while (largestPalette > 0) {
                    if (colorbrewer[id][largestPalette]) {
                        scale = d3.scale.ordinal().range(colorbrewer[id][largestPalette]);
                        break;
                    }
                    --largestPalette;
                }
            }
            if (!scale) {
                //  Default to Category20  ---
                scale = d3.scale.category20();
            }
            colors = scale.range();
        }
        function ordinal(_) {
            return scale(_);
        }
        ordinal.id = function (_) {
            if (!arguments.length) return id;
            id = _;
            return ordinal;
        }
        ordinal.colors = function (_) {
            if (!arguments.length) return colors;
            colors = _;
            return ordinal;
        }
        ordinal.clone = function (newID) {
            ordinalCache[newID] = palette_ordinal(newID, this.colors());
            return ordinalCache[newID];

        }
        ordinal.switch = function (_id, _colors) {
            if (id === _id) {
                return this;
            }
            return arguments.length ? fetchOrdinalItem(_id, _colors) : fetchOrdinalItem();
        };

        return ordinal;
    };

    var rainbowCache = {};
    function fetchRainbowItem(id, colors, steps) {
        if (!id) return palette_rainbow();
        var retVal = rainbowCache[id];
        if (!retVal) {
            retVal = palette_rainbow(id, colors);
            rainbowCache[id] = retVal;
        }
        return retVal;
    };

    function palette_rainbow(id, _colors, _steps) {
        if (!arguments.length) {
            var retVal = ["default"];
            for (var key in colorbrewer) {
                if (brewerOrdinal.indexOf(key) === -1) {
                    retVal.push(key);
                }
            }
            return retVal;
        };

        var id = id;
        var scale = null;
        var colors = _colors;

        var _custom = function (colors, steps) {
            steps = steps || 32;
            var subPaletteSize = Math.ceil(steps / (colors.length - 1));
            var range = [];
            var prevColor = null;
            colors.forEach(function (color) {
                if (prevColor) {
                    var scale = d3.scale.linear()
                        .domain([0, subPaletteSize])
                        .range([prevColor, color])
                        .interpolate(d3.interpolateLab)
                    ;
                    for (var i = 0; i < subPaletteSize; ++i) {
                        range.push(scale(i));
                    }
                }
                prevColor = color;
            });
            scale = d3.scale.quantize().domain([0, 100]).range(range);
            return scale;
        };

        if (_colors) {
            scale = _custom(_colors, _steps);
        } else {
            if (colorbrewer[id]) {
                var largestPalette = 12;
                while (largestPalette > 0) {
                    if (colorbrewer[id][largestPalette]) {
                        scale = _custom(colorbrewer[id][largestPalette]);
                        break;
                    }
                    --largestPalette;
                }
            }
            if (!scale) {
                scale = _custom(colorbrewer.RdYlGn[11]);
            }
            colors = scale.range();

        }
        function rainbow(x, low, high) {
            return scale.domain([low, high])(x);
        };
        rainbow.id = function (_) {
            if (!arguments.length) return id;
            id = _;
            return rainbow;
        };
        rainbow.colors = function (_) {
            if (!arguments.length) return colors;
            colors = _;
            return rainbow;
        };
        rainbow.clone = function (newID) {
            rainbowCache[newID] = palette_rainbow(newID, this.color());
            return rainbowCache[newID];
        };
        rainbow.switch = function (_id, _colors) {
            if (id === _id) {
                return this;
            }
            return arguments.length ? fetchRainbowItem(_id, _colors) : fetchRainbowItem();
        };

        return rainbow;
    };

    var test = function(ordinalDivID, brewerDivID, customDivID, customArr, steps) {
        d3.select(ordinalDivID)
          .selectAll(".palette")
            .data(palette_ordinal(), function (d) { return d; })
          .enter().append("span")
            .attr("class", "palette")
            .attr("title", function(d) { return d; })
            .on("click", function(d) { 
                console.log(d3.values(d.value).map(JSON.stringify).join("\n")); 
            })
          .selectAll(".swatch").data(function (d) { return palette_ordinal(d).colors(); })
          .enter().append("span")
            .attr("class", "swatch")
            .style("background-color", function(d) { return d; });

        d3.select(brewerDivID)
          .selectAll(".palette")
            .data(palette_rainbow(), function (d) { return d; })
          .enter().append("span")
            .attr("class", "palette")
            .attr("title", function(d) { return d; })
            .on("click", function(d) { 
                console.log(d3.values(d.value).map(JSON.stringify).join("\n")); 
            })
          .selectAll(".swatch2").data(function (d) { return palette_rainbow(d).colors(); })
          .enter().append("span")
            .attr("class", "swatch2")
            .style("height", (256 / 32)+"px")
            .style("background-color", function(d) { return d; });
            
        var palette = { id: customArr.join("_") + steps, scale: palette_rainbow("custom", customArr, steps) };
        d3.select(customDivID)
          .selectAll(".palette")
            .data([palette], function (d) { return d.id; })
          .enter().append("span")
            .attr("class", "palette")
            .attr("title", function(d) { return "aaa";/*d.from + "->" + d.to;*/ })
            .on("click", function(d) { 
                console.log(d3.values(d.value).map(JSON.stringify).join("\n")); 
            })
          .selectAll(".swatch2").data(function(d) {
                var retVal = [];
                for (var i = 0; i <= 255; ++i) {
                    retVal.push(palette.scale(i, 0, 255));
                }
                return retVal;
          })
          .enter().append("span")
            .attr("class", "swatch2")
            .style("background-color", function(d) { return d; });
    };    

    return {
        ordinal: fetchOrdinalItem,
        rainbow: fetchRainbowItem,
        test: test
    };
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/INDChart.js',["../common/Palette"], factory);
    } else {
        root.INDChart = factory(root.Palette);
    }
}(this, function (Palette) {
    function INDChart() {
    };
    INDChart.prototype._palette = Palette.ordinal("default");

    //  Data ---
    INDChart.prototype.testData = function () {
        this.columns(["Subject", "Year 1", "Year 2", "Year 3"]);
        this.data([
            ["Geography", 75, 68, 65],
            ["English", 45, 55, 52],
            ["Math", 98, 92, 90],
            ["Science", 66, 60, 66]
        ]);
        return this;
    };

    //  Events  ---
    INDChart.prototype.click = function (row, column) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column);
    };

    return INDChart;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/CommonND.js',["./Common", "../chart/INDChart"], factory);
    } else {
        root.CommonND = factory(root.Common, root.INDChart);
    }
}(this, function (Common, INDChart) {
    function CommonND(target) {
        Common.call(this);
        INDChart.call(this);
        this._class = "c3_CommonND";

        var context = this;
        this._config.color = {
            pattern: this._palette.colors()
        };

        this._config.data.onclick = function (d, element) {
            context.click(context.rowToObj(context._data[d.index]), d.id);
        };
        this._config.data.color = function (color, d) {
            return context._palette(d.id ? d.id : d);
        };
        this._prevColumns = [];
    };
    CommonND.prototype = Object.create(Common.prototype);
    CommonND.prototype.implements(INDChart.prototype);

    CommonND.prototype.publish("paletteID", "default", "set", "Palette ID", CommonND.prototype._palette.switch());
    CommonND.prototype.publish("xaxis_type", "category", "set", "X-Axis Type", ["category", "timeseries", "indexed"]);
    CommonND.prototype.publish("subchart", false, "boolean", "Show SubChart");

    CommonND.prototype.getDiffC3Columns = function () {
        return this._prevColumns.filter(function (i) { return this._columns.indexOf(i) < 0; }, this);
    };

    CommonND.prototype.render = function () {
        var retVal = Common.prototype.render.apply(this, arguments);
        this._prevColumns = this._columns;
        return retVal;
    };

    CommonND.prototype.enter = function (domNode, element) {
        if (this._subchart) {
            this._config.subchart = {
                show: true, size: {
                    height: 20
                }
            };
        }

        this._config.axis.x = {
            type: this._xaxis_type
        };

        switch (this._xaxis_type) {
        case "category":
            this._config.axis.tick = {
                centered: true,
                multiline: false
            }
            break;
        case "timeseries":
            this._config.data.x = this._columns[0];
            this._config.axis.tick = {
                format: '%d %b %Y'
            }
            break;
        }

        Common.prototype.enter.apply(this, arguments);
    };

    CommonND.prototype.update = function (domNode, element) {
        Common.prototype.update.apply(this, arguments);
        
        this._palette = this._palette.switch(this._paletteID);

        switch (this._xaxis_type) {
            case "category":
                this.c3Chart.load({
                    categories: this.getC3Categories(),
                    columns: this.getC3Columns(),
                    unload: this.getDiffC3Columns()
                });
                break;
            case "indexed":
            case "timeseries":
                this.c3Chart.load({
                    columns: this.getC3Columns(),
                    unload: this.getDiffC3Columns()
                });
                break;
        }
    };

    return CommonND;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Area.js',["./CommonND"], factory);
    } else {
        root.Area = factory(root.CommonND);
    }
}(this, function (CommonND) {
    function Area(target) {
        CommonND.call(this);
        this._class = "c3_Area";

        this._type = "area";
    };
    Area.prototype = Object.create(CommonND.prototype);

    return Area;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Column.js',["./CommonND"], factory);
    } else {
        root.Column = factory(root.CommonND);
    }
}(this, function (CommonND) {
    function Column(target) {
        CommonND.call(this);
        this._class = "c3_Column";

        this._type = "bar";
    };
    Column.prototype = Object.create(CommonND.prototype);

    return Column;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Bar.js',["./Column"], factory);
    } else {
        root.Bar = factory(root.Column);
    }
}(this, function (Column) {
    function Bar(target) {
        Column.call(this);
        this._class = "c3_Bar";

        this._config.axis.rotated = true;
    };
    Bar.prototype = Object.create(Column.prototype);

    return Bar;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/I1DChart.js',["../common/Palette"], factory);
    } else {
        root.I1DChart = factory(root.Palette);
    }
}(this, function (Palette) {
    function I1DChart() {
    };
    I1DChart.prototype._palette = Palette.rainbow("default");

    //  Data ---
    I1DChart.prototype.testData = function () {
        this.columns("Result");
        this.data(66);
        return this;
    };

    //  Events  ---
    I1DChart.prototype.click = function (row, column) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column);
    };

    return I1DChart;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Common1D',["./Common", "../chart/I1DChart"], factory);
    } else {
        root.Common1D = factory(root.Common, root.I1DChart);
    }
}(this, function (Common, I1DChart) {
    function Common1D(target) {
        Common.call(this);
        I1DChart.call(this);
        this._class = "c3_Common1D";

        var context = this;
        this._config.color = {
            pattern: this._palette.colors()
        };

        this._config.data.onclick = function (d, element) {
            context.click(context.rowToObj(context._data[d.i1Dex]), d.id);
        };
        this._config.data.color = function (color, d) {
            return context._palette(d.id ? d.id : d);
        };
    };
    Common1D.prototype = Object.create(Common.prototype);
    Common1D.prototype.implements(I1DChart.prototype);

    Common1D.prototype.publish("paletteID", "default", "set", "Palette ID", Common1D.prototype._palette.switch());
	
    Common1D.prototype.update = function (domNode, element) {
        Common.prototype.update.apply(this, arguments);
        this._palette = this._palette.switch(this._paletteID);
    };

    return Common1D;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/I2DChart.js',["../common/Palette"], factory);
    } else {
        root.I2DChart = factory(root.Palette);
    }
}(this, function (Palette) {
    function I2DChart() {
    };
    I2DChart.prototype._palette = Palette.ordinal("default");

    //  Data ---
    I2DChart.prototype.testData = function () {
        this.columns(["Subject", "2nd Year"]);
        this.data([
            ["Geography", 75],
            ["English", 45],
            ["Math", 98],
            ["Science", 66]
        ]);
        return this;
    };

    //  Events  ---
    I2DChart.prototype.click = function (row, column) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column);
    };

    return I2DChart;
}));

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Common2D',["./Common", "../chart/I2DChart"], factory);
    } else {
        root.Common2D = factory(root.Common, root.I2DChart);
    }
}(this, function (Common, I2DChart) {
    function Common2D(target) {
        Common.call(this);
        I2DChart.call(this);
        this._class = "c3_Common2D";

        var context = this;
        this._config.color = {
            pattern: this._palette.colors()
        };

        this._config.data.onclick = function (d, element) {
            context.click(context.rowToObj(context._data[d.index]), context._columns[1]);
        };
        this._config.data.color = function (color, d) {
            return context._palette(d.id ? d.id : d);
        };
    };
    Common2D.prototype = Object.create(Common.prototype);
    Common2D.prototype.implements(I2DChart.prototype);

    Common2D.prototype.publish("paletteID", "default", "set", "Palette ID", Common2D.prototype._palette.switch());

    Common2D.prototype.update = function (domNode, element) {
        Common.prototype.update.apply(this, arguments);
        this._palette = this._palette.switch(this._paletteID);
    };

    return Common2D;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Donut.js',["./Common2D"], factory);
    } else {
        root.Donut = factory(root.Common2D);
    }
}(this, function (Common2D) {
    function Donut(target) {
        Common2D.call(this);
        this._class = "c3_Donut";

        this._type = "donut";
    };
    Donut.prototype = Object.create(Common2D.prototype);

    Donut.prototype.publish("label_show", true, "boolean", "Show Label");
    //Donut.prototype.publish("label_format", null, "function", "???");
    //Donut.prototype.publish("label_threshold", 0.05, "number", "???");
    Donut.prototype.publish("arc_width", 45, "number", "Arc Width");
    Donut.prototype.publish("expand", true, "boolean", "Arc Explode");
    Donut.prototype.publish("title", "xxx", "string", "Label");

    Donut.prototype.enter = function (domNode, element) {
        this._config.donut = {
            label_show: this.label_show(),
            width: this.arc_width(),
            expand: this.expand(),
            title: this.title()
        }

        Common2D.prototype.enter.apply(this, arguments);
    };

    Donut.prototype.update = function (domNode, element) {
        Common2D.prototype.update.apply(this, arguments);
        
        this.c3Chart.internal.config.donut_label_show = this.label_show();
//        this.c3Chart.internal.config.donut_label_format = this.high();
//        this.c3Chart.internal.config.donut_label_threshold = this.show_value_label() ? this.columns() : "";
        this.c3Chart.internal.config.donut_width = this.arc_width();
        this.c3Chart.internal.config.donut_expand = this.expand();
        this.c3Chart.internal.config.donut_title = this.title();

        var data = this._data.map(function (row, idx) {
            return [row[0], row[1]];
        }, this);
        this.c3Chart.load({
            columns: data
        });
    };

    return Donut;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Gauge.js',["./Common1D"], factory);
    } else {
        root.Gauge = factory(root.Common1D);
    }
}(this, function (Common1D) {
    function Gauge(target) {
        Common1D.call(this);

        this._class = "c3_Gauge";
        this._type = "gauge";

        var context = this;
        this._config.data.onclick = function (d, element) {
            var clickEvent = {};
            clickEvent[d.id] = d.value;
            context.click(clickEvent, d.id);
        };
        this._config.data.color = function (color, d) {
            return context._palette(context._data, context._low, context._high);
        };
    };
    Gauge.prototype = Object.create(Common1D.prototype);

    Gauge.prototype.publish("low", 0, "number", "Gauge lower bound");
    Gauge.prototype.publish("high", 100, "number", "Gauge higher bound");
    Gauge.prototype.publish("value_format", "Percent", "set", "Value Display Format", ["Percent", "Value"]);
    Gauge.prototype.publish("arc_width", 50, "number", "Gauge width of arc");
    Gauge.prototype.publish("show_labels", true, "boolean", "Show Labels");
    Gauge.prototype.publish("show_value_label", true, "boolean", "Show Value Label");

    Gauge.prototype.update = function (domNode, element) {
        Common1D.prototype.update.apply(this, arguments);

        this.c3Chart.internal.config.gauge_min = this.low();
        this.c3Chart.internal.config.gauge_max = this.high();
        this.c3Chart.internal.config.gauge_units = this.show_value_label() ? this.columns() : "";
        this.c3Chart.internal.config.gauge_width = this.arc_width();
        this.c3Chart.internal.config.gauge_label_format = this.value_format() === "Percent" ? null : function (value, ratio) { return value; };
        this.c3Chart.internal.config.gauge_label_show = this.show_labels();
        this.c3Chart.load({
            columns: [[this._columns, this._data]]
        });
    };

    return Gauge;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Line',["./CommonND"], factory);
    } else {
        root.Line = factory(root.CommonND);
    }
}(this, function (CommonND) {
    function Line(target) {
        CommonND.call(this);
        this._class = "c3_Line";

        this._type = "line";
    };
    Line.prototype = Object.create(CommonND.prototype);

    return Line;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Pie.js',["./Common2D"], factory);
    } else {
        root.Pie = factory(root.Common2D);
    }
}(this, function (Common2D) {
    function Pie(target) {
        Common2D.call(this);
        this._class = "c3_Pie";

        this._type = "pie";
    };
    Pie.prototype = Object.create(Common2D.prototype);

    Pie.prototype.update = function (domNode, element) {
        Common2D.prototype.update.apply(this, arguments);
        
        var data = this._data.map(function (row, idx) {
            return [row[0], row[1]];
        }, this);
        this.c3Chart.load({
            columns: data
        });
    };

    return Pie;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Scatter.js',["./CommonND"], factory);
    } else {
        root.Scatter = factory(root.CommonND);
    }
}(this, function (CommonND) {
    function Scatter(target) {
        CommonND.call(this);
        this._class = "c3_Scatter";

        this._type = "scatter";
    };
    Scatter.prototype = Object.create(CommonND.prototype);

    return Scatter;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Step.js',["./CommonND"], factory);
    } else {
        root.Step = factory(root.CommonND);
    }
}(this, function (CommonND) {
    function Step(target) {
        CommonND.call(this);
        this._class = "c3_Step";

        this._type = "step";
    };
    Step.prototype = Object.create(CommonND.prototype);

    return Step;
}));

define('async',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('propertyParser',{});
define('goog',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Common.js',["d3/d3", "../common/HTMLWidget", "goog!visualization,1,packages:[corechart]"], factory);
    } else {
        root.Common = factory(root.d3, root.HTMLWidget);
    }
}(this, function (d3, HTMLWidget) {

    function Common(tget) {
        HTMLWidget.call(this);
        this._class = "google_Common";

        this._tag = "div";

        this.columns([]);
        this.data([]);
        this._data_google = [];

        this._chart = null;
    };
    Common.prototype = Object.create(HTMLWidget.prototype);

    Common.prototype.publish("chartAreaWidth", "80%", "string", "Chart Area Width");
    Common.prototype.publish("chartAreaHeight", "80%", "string", "Chart Area Height");

    Common.prototype.publish("fontSize", null, "number", "Font Size");
    Common.prototype.publish("fontName", null, "string", "Font Name");

    Common.prototype.publish("legendShow", true, "boolean", "Show Legend");
    Common.prototype.publish("legendAlignment", "center", "set", "Legend Alignment", ["", "start", "center", "end"]);
    Common.prototype.publish("legendPosition", "right", "set", "Legend Position", ["", "bottom", "labeled", "left", "right", "top"]);
    Common.prototype.publish("legendFontColor", "#000", "html-color", "Legend Font Color");
    Common.prototype.publish("legendFontName", null, "string", "Legend Font Name");
    Common.prototype.publish("legendFontSize", null, "number", "Legend Font Size");
    Common.prototype.publish("legendFontBold", false, "boolean", "Legend Font Bold");
    Common.prototype.publish("legendFontItalic", false, "boolean", "Legend Font Italic");

    Common.prototype.publish("animationDuration", 0, "number", "Animation Duration");
    Common.prototype.publish("animationOnStartup", true, "boolean", "Animate On Startup");
    Common.prototype.publish("animationEasing", "linear", "set", "Animation Easing", ["", "linear", "in", "out", "inAndOut"]);

    Common.prototype.data = function (_) {
        var retVal = HTMLWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            var data = null;
            if (this._data.length) {
                data = [this._columns].concat(this._data);
            } else {
                data = [
                    ['', { role: 'annotation' }],
                    ['', '']
                ];
            }
            this._data_google = google.visualization.arrayToDataTable(data);
        }
        return retVal;
    };

    Common.prototype.getChartOptions = function () {
        var colors = this._columns.filter(function (d, i) { return i > 0; }).map(function (row) {
            return this._palette(row);
        }, this);

        return {
            backgroundColor: "none",
            width: this.width(),
            height: this.height(),
            colors: colors,
            fontSize: this._fontSize,
            fontName: this._fontName,
            chartArea: {
                width: this._chartAreaWidth,
                height: this._chartAreaHeight
            },
            animation: {
                duration: this._animationDuration,
                startup: this._animationOnStartup,
                easing: this._animationEasing
            },
            legend: {
                alignment: this._legendAlignment,
                position: this._legendShow ? this._legendPosition : "none",
                maxLines: 2,
                textStyle: {
                    color: this._legendFontColor,
                    fontName: this._legendFontName,
                    fontSize: this._legendFontSize,
                    bold: this._legendFontBold,
                    italic: this._legendFontItalic
                }
            },
        };
    },

    Common.prototype.enter = function (domNode, element) {
        element.style("overflow", "hidden");

        this._chart = new google.visualization[this._chartType](domNode);

        var context = this;
        google.visualization.events.addListener(this._chart, "select", function () {
            var selectedItem = context._chart.getSelection()[0];
            if (selectedItem) {
                context.click(context.rowToObj(context._data[selectedItem.row]), context._columns[selectedItem.column]);
            }
        });
    }

    Common.prototype.update = function(domNode, element) {
        HTMLWidget.prototype.update.apply(this, arguments);

        this._chart.draw(this._data_google, this.getChartOptions());
    };
    
    return Common;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/CommonND.js',["d3/d3", "../google/Common", "../chart/INDChart", "goog!visualization,1,packages:[corechart]"], factory);
    } else {
        root.CommonND = factory(root.d3, root.Common, root.INDChart);
    }
}(this, function (d3, Common, INDChart) {

    function CommonND() {
        Common.call(this);
        INDChart.call(this);
        this._class = "google_CommonND";
    };
    CommonND.prototype = Object.create(Common.prototype);
    CommonND.prototype.implements(INDChart.prototype);

    CommonND.prototype.publish("paletteID", "default", "set", "Palette ID", CommonND.prototype._palette.switch());

    CommonND.prototype.update = function(domNode, element) {   
        this._palette = this._palette.switch(this._paletteID);

        Common.prototype.update.apply(this, arguments);
    }

    return CommonND;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Bar.js',["d3/d3", "./CommonND"], factory);
    } else {
        root.Bar = factory(root.d3, root.CommonND);
    }
}(this, function (d3, CommonND) {

    function Bar() {
        CommonND.call(this);
        this._class = "google_Bar";

        this._chartType = "BarChart";
    };
    Bar.prototype = Object.create(CommonND.prototype);

    //  TODO:  Publish Bar Properties Here
   
    Bar.prototype.getChartOptions = function () {
        var retVal = CommonND.prototype.getChartOptions.apply(this, arguments);
        //  TODO:  Add Bar Properties Here
        return retVal;
    };

    Bar.prototype.enter = function (domNode, element) {
        CommonND.prototype.enter.apply(this, arguments);
    };

    Bar.prototype.update = function (domNode, element) {      
        CommonND.prototype.update.apply(this, arguments);
    };

    return Bar;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Column.js',["d3/d3", "./CommonND"], factory);
    } else {
        root.Column = factory(root.d3, root.CommonND);
    }
}(this, function (d3, CommonND) {

    function Column() {
        CommonND.call(this);
        this._class = "google_Column";

        this._chartType = "ColumnChart";
    };
    Column.prototype = Object.create(CommonND.prototype);
    //  TODO:  Publish Column Properties Here

    Column.prototype.getChartOptions = function () {
        var retVal = CommonND.prototype.getChartOptions.apply(this, arguments);
        //  TODO:  Add Column Properties Here
        return retVal;
    };
    
    Column.prototype.enter = function (domNode, element) {
        CommonND.prototype.enter.apply(this, arguments);
    };

    Column.prototype.update = function (domNode, element) {
        CommonND.prototype.update.apply(this, arguments);
    };

    return Column;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Common2D',["d3/d3", "../google/Common", "../chart/I2DChart", "goog!visualization,1,packages:[corechart]"], factory);
    } else {
        root.Common2D = factory(root.d3, root.Common, root.I2DChart);
    }
}(this, function (d3, Common, I2DChart) {

    function Common2D() {
        Common.call(this);
        I2DChart.call(this);
        this._class = "google_Common2D";
    };
    Common2D.prototype = Object.create(Common.prototype);
    Common2D.prototype.implements(I2DChart.prototype);

    Common2D.prototype.publish("paletteID", "default", "set", "Palette ID", Common2D.prototype._palette.switch());

    Common2D.prototype.update = function(domNode, element) {
        this._palette = this._palette.switch(this._paletteID);
        
        Common.prototype.update.apply(this, arguments);
    }

    return Common2D;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Line.js',["d3/d3", "./CommonND"], factory);
    } else {
        root.Line = factory(root.d3, root.CommonND);
    }
}(this, function (d3, CommonND) {

    function Line() {
        CommonND.call(this);
        this._class = "google_Line";

        this._chartType = "LineChart";
    };
    Line.prototype = Object.create(CommonND.prototype);
    //  TODO:  Publish Line Properties Here

    Line.prototype.getChartOptions = function () {
        var retVal = CommonND.prototype.getChartOptions.apply(this, arguments);
        //  TODO:  Add Line Properties Here
        return retVal;
    };

    Line.prototype.enter = function (domNode, element) {
        CommonND.prototype.enter.apply(this, arguments);
    };

    Line.prototype.update = function (domNode, element) {
        CommonND.prototype.update.apply(this, arguments);
    };
    
    return Line;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Pie.js',["d3/d3", "./Common2D"], factory);
    } else {
        root.Pie = factory(root.d3, root.Common2D);
    }
}(this, function (d3, Common2D) {

    function Pie() {
        Common2D.call(this);
        this._class = "google_Pie";

        this._chartType = "PieChart";
    };
    Pie.prototype = Object.create(Common2D.prototype);
    
    Pie.prototype.publish("is3D", true, "boolean", "Enable 3D");
    Pie.prototype.publish("pieHole", 0, "number", "Pie Hole Size");
    Pie.prototype.publish("pieStartAngle", 0, "number", "Pie Start Angle");

    Pie.prototype.getChartOptions = function () {
        var retVal = Common2D.prototype.getChartOptions.apply(this, arguments);

        retVal.colors = this._data.map(function (row) {
            return this._palette(row[0]);
        }, this);
        retVal.is3D = this._is3D;
        retVal.pieHole = this._pieHole;
        retVal.pieStartAngle = this._pieStartAngle;
        return retVal;
    };
    
    Pie.prototype.enter = function (domNode, element) {
        Common2D.prototype.enter.apply(this, arguments);
    };

    Pie.prototype.update = function (domNode, element) {
        Common2D.prototype.update.apply(this, arguments);
    };

    return Pie;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/SVGWidget.js',["./Widget", "./Transition", "d3/d3"], factory);
    } else {
        root.SVGWidget = factory(root.Widget, root.Transition, root.d3);
    }
}(this, function (Widget, Transition, d3) {
    function SVGWidget() {
        Widget.call(this);

        this._tag = "g";

        this._boundingBox = null;

        this.transition = new Transition(this);
    };
    SVGWidget.prototype = Object.create(Widget.prototype);

    //  Properties  ---
    SVGWidget.prototype.move = function (_, transitionDuration) {
        var retVal = this.pos.apply(this, arguments);
        if (arguments.length) {
            (transitionDuration ? this._element.transition().duration(transitionDuration) : this._element)
                .attr("transform", "translate(" + _.x + " " + _.y + ")")
            ;
        }
        return retVal;
    };

    SVGWidget.prototype.size = function (_) {
        var retVal = Widget.prototype.size.apply(this, arguments);
        if (arguments.length) {
            this._boundingBox = null;
        }
        return retVal;
    };

    SVGWidget.prototype.resize = function (size) {
        var retVal = Widget.prototype.resize.apply(this, arguments);
        this._parentRelativeDiv
            .style({
                width: this._size.width + "px",
                height: this._size.height + "px"
            })
        ;
        this._parentElement
            .attr("width", this._size.width)
            .attr("height", this._size.height)
        ;
        this.pos({
            x: this._size.width / 2,
            y: this._size.height / 2
        });
        return retVal;
    };

    SVGWidget.prototype.target = function (_) {
        if (!arguments.length) return this._target;
        if (this._target && _ && (this._target.__data__.id !== _.__data__.id)) {
            throw "Target can only be assigned once."
        }
        this._target = _;

        //  Target is a DOM Node ID ---
        if (typeof (this._target) === 'string' || this._target instanceof String) {
            this._target = document.getElementById(this._target);
        }

        if (this._target instanceof SVGElement) {
            this._parentElement = d3.select(this._target);
            this._parentWidget = this._parentElement.datum();
            if (!this._parentWidget || this._parentWidget._id === this._id) {
                this._parentWidget = this.locateParentWidget(this._target.parentNode);
            }
        } else if (this._target) {
            //  Target is a DOM Node, so create a SVG Element  ---
            this._parentRelativeDiv = d3.select(this._target).append("div")
                .style({
                    position: "relative"
                })
            ;
            this._parentElement = this._parentRelativeDiv.append("svg")
                .style({
                    position: "absolute",
                    top: 0,
                    left: 0
                })
            ;
            this._parentOverlay = this._parentRelativeDiv.append("div")
                .style({
                    position: "absolute",
                    top: 0,
                    left: 0
                })
            ;
            this.resize(this._size);
        } else {
            this.exit();
        }
        return this;
    };

    SVGWidget.prototype.enter = function (domeNode, element, d) {
        Widget.prototype.enter.apply(this, arguments);
    };

    SVGWidget.prototype.update = function (domeNode, element, d) {
        Widget.prototype.update.apply(this, arguments);
        element.attr("transform", "translate(" + this._pos.x + " " + this._pos.y + ")");
    };

    SVGWidget.prototype.exit = function (domeNode, element, d) {
        if (this._parentRelativeDiv) {
            this._parentOverlay.remove();
            this._parentElement.remove();
            this._parentRelativeDiv.remove();
        }
        Widget.prototype.exit.apply(this, arguments);
    };

    SVGWidget.prototype.getOffsetPos = function () {
        var retVal = { x: 0, y: 0 };
        if (this._parentWidget) {
            retVal = this._parentWidget.getOffsetPos();
            retVal.x += this._pos.x;
            retVal.y += this._pos.y;
            return retVal;
        }
        return retVal;
    },

    SVGWidget.prototype.getBBox = function (refresh, round) {
        if (refresh || this._boundingBox === null) {
            var svgNode = this._element.node();
            if (svgNode instanceof SVGElement) {
                this._boundingBox = svgNode.getBBox();
            }
        }
        if (this._boundingBox === null) {
            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            }
        }
        return {
            x: (round ? Math.round(this._boundingBox.x) : this._boundingBox.x) * this._scale,
            y: (round ? Math.round(this._boundingBox.y) : this._boundingBox.y) * this._scale,
            width: (round ? Math.round(this._boundingBox.width) : this._boundingBox.width) * this._scale,
            height: (round ? Math.round(this._boundingBox.height) : this._boundingBox.height) * this._scale
        }
    };

    //  Intersections  ---
    SVGWidget.prototype.intersection = function (pointA, pointB) {
        return this.intersectRect(pointA, pointB);
    };

    var lerp = function (point, that, t) {
        //  From https://github.com/thelonious/js-intersections
        return {
            x: point.x + (that.x - point.x) * t,
            y: point.y + (that.y - point.y) * t
        };
    };

    var intersectLineLine = function (a1, a2, b1, b2) {
        //  From https://github.com/thelonious/js-intersections
        var result = { type: "", points: [] };
        var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
        var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
        var u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

        if (u_b != 0) {
            var ua = ua_t / u_b;
            var ub = ub_t / u_b;

            if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
                result.type = "Intersection";
                result.points.push({
                    x: a1.x + ua * (a2.x - a1.x),
                    y: a1.y + ua * (a2.y - a1.y)
                });
            } else {
                result.type = "No Intersection";
            }
        } else {
            if (ua_t == 0 || ub_t == 0) {
                result.type = "Coincident";
            } else {
                result.type = "Parallel";
            }
        }

        return result;
    };

    SVGWidget.prototype.intersectRect = function (pointA, pointB) {
        var center = this.getOffsetPos();
        var size = this.getBBox();
        if (pointA.x === pointB.x && pointA.y === pointB.y) {
            return pointA;
        }
        var TL = { x: center.x - size.width / 2, y: center.y - size.height / 2 };
        var TR = { x: center.x + size.width / 2, y: center.y - size.height / 2 };
        var BR = { x: center.x + size.width / 2, y: center.y + size.height / 2 };
        var BL = { x: center.x - size.width / 2, y: center.y + size.height / 2 };
        var intersection = intersectLineLine(TL, TR, pointA, pointB);
        if (intersection.points.length) {
            return { x: intersection.points[0].x, y: intersection.points[0].y };
        }
        intersection = intersectLineLine(TR, BR, pointA, pointB);
        if (intersection.points.length) {
            return { x: intersection.points[0].x, y: intersection.points[0].y };
        }
        intersection = intersectLineLine(BR, BL, pointA, pointB);
        if (intersection.points.length) {
            return { x: intersection.points[0].x, y: intersection.points[0].y };
        }
        intersection = intersectLineLine(BL, TL, pointA, pointB);
        if (intersection.points.length) {
            return { x: intersection.points[0].x, y: intersection.points[0].y };
        }
        return null;
    };

    var intersectCircleLine = function (c, r, a1, a2) {
        //  From https://github.com/thelonious/js-intersections
        var result = { type: "", points: [] };
        var a = (a2.x - a1.x) * (a2.x - a1.x) +
                 (a2.y - a1.y) * (a2.y - a1.y);
        var b = 2 * ((a2.x - a1.x) * (a1.x - c.x) +
                       (a2.y - a1.y) * (a1.y - c.y));
        var cc = c.x * c.x + c.y * c.y + a1.x * a1.x + a1.y * a1.y -
                 2 * (c.x * a1.x + c.y * a1.y) - r * r;
        var deter = b * b - 4 * a * cc;

        if (deter < 0) {
            result.type = "Outside";
        } else if (deter == 0) {
            result.type = "Tangent";
            // NOTE: should calculate this point
        } else {
            var e = Math.sqrt(deter);
            var u1 = (-b + e) / (2 * a);
            var u2 = (-b - e) / (2 * a);

            if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
                if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
                    result.type = "Outside";
                } else {
                    result.type = "Inside";
                }
            } else {
                result.type = "Intersection";

                if (0 <= u1 && u1 <= 1)
                    result.points.push(lerp(a1, a2, u1));

                if (0 <= u2 && u2 <= 1)
                    result.points.push(lerp(a1, a2, u2));
            }
        }

        return result;
    };

    SVGWidget.prototype.intersectCircle = function (pointA, pointB) {
        var center = this.getOffsetPos();
        var radius = this.radius();
        var intersection = intersectCircleLine(center, radius, pointA, pointB);
        if (intersection.points.length) {
            return { x: intersection.points[0].x, y: intersection.points[0].y };
        }
        return null;
    };

    SVGWidget.prototype.distance = function (pointA, pointB) {
        return Math.sqrt((pointA.x - pointB.x) * (pointA.x - pointB.x) + (pointA.y - pointB.y) * (pointA.y - pointB.y));
    };

    //  IE Fixers  ---    
    SVGWidget.prototype._pushMarkers = function (element, d) {
        if (this.svgMarkerGlitch) {
            element = element || this._element;
            element.selectAll("path[marker-start],path[marker-end]")
                .attr("fixme-start", function (d) { return this.getAttribute("marker-start"); })
                .attr("fixme-end", function (d) { return this.getAttribute("marker-end"); })
                .attr("marker-start", null)
                .attr("marker-end", null)
            ;
        }
    };

    SVGWidget.prototype._popMarkers = function (element, d) {
        if (this.svgMarkerGlitch) {
            element = element || this._element;
            element.selectAll("path[fixme-start],path[fixme-end]")
                .attr("marker-start", function (d) {
                    return this.getAttribute("fixme-start");
                })
                .attr("marker-end", function (d) { return this.getAttribute("fixme-end"); })
                .attr("fixme-start", null)
                .attr("fixme-end", null)
            ;
        }
    }

    SVGWidget.prototype._popMarkersDebounced = Widget.prototype.debounce(function (element, d) {
        if (this.svgMarkerGlitch) {
            this._popMarkers(element, d);
        }
    }, 250);

    SVGWidget.prototype._fixIEMarkers = function (element, d) {
        if (this.svgMarkerGlitch) {
            this._pushMarkers(element, d);
            this._popMarkersDebounced(element, d);
        }
    };

    return SVGWidget;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Text.js',["./SVGWidget", "css!./Text"], factory);
    } else {
        root.Entity = factory(root.SVGWidget);
    }
}(this, function (SVGWidget) {
    function Text() {
        SVGWidget.call(this);
        this._class = "common_Text";
    };
    Text.prototype = Object.create(SVGWidget.prototype);
    Text.prototype.publish("text", "", "string", "Display Text");
    Text.prototype.publish("font_family", "", "string", "Font Family");
    Text.prototype.publish("font_size", null, "number", "Font Size (px)");
    Text.prototype.publish("anchor", "middle", "set", "Anchor Position", ["start", "middle", "end"]);
    Text.prototype.publish("color_fill", null, "html-color", "Fill Color");

    Text.prototype.testData = function () {
        this.text("Hello\nand\nWelcome!");
        return this;
    }

    Text.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._textElement = element.append("text");
    };

    Text.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        this._textElement
            .attr("font-family", this.__meta_font_family.defaultValue !== this._font_family ? this._font_family : null)
            .attr("font-size", this.__meta_font_size.defaultValue !== this._font_size ? this._font_size : null)
        ;
        var textParts = this._text.split("\n");
        var textLine = this._textElement.selectAll("tspan").data(textParts, function (d) { return d; });
        textLine.enter().append("tspan")
            .attr("class", function (d, i) { return "tspan_" + i; })
            .attr("dy", "1em")
            .attr("x", "0")
        ;
        textLine
            .style("fill", this.__meta_color_fill.defaultValue !== this._color_fill ? this._color_fill : null)
            .text(function (d) { return d; })
        ;
        textLine.exit()
            .remove()
        ;

        var bbox = { width: 0, height: 0 };
        try {   //  https://bugzilla.mozilla.org/show_bug.cgi?id=612118
            bbox = this._textElement.node().getBBox();
        } catch (e) {
        }
        var xOffset = 0;
        switch(this._anchor) {
            case "start":
                xOffset = -bbox.width / 2;
                break;
            case "end":
                xOffset = bbox.width / 2;
                break;
        };
        var yOffset = -(bbox.y + bbox.height / 2);

        this._textElement
            .style("text-anchor", this._anchor)
            .attr("transform", function (d) { return "translate(" + xOffset + "," + yOffset + ")"; })
        ;
    };

    return Text;
}));




(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/FAChar',["./SVGWidget", "./Text", "css!lib/Font-Awesome/css/font-awesome", "css!./FAChar"], factory);
    } else {
        root.Entity = factory(root.SVGWidget, root.Text);
    }
}(this, function (SVGWidget, Text) {
    function FAChar() {
        SVGWidget.call(this);
        this._class = "common_FAChar";

        this._text = new Text()
            .font_family("FontAwesome")
        ;
    };
    FAChar.prototype = Object.create(SVGWidget.prototype);
    FAChar.prototype.publish("char", "", "string", "Font Awesome Item");
    FAChar.prototype.publish("font_size", null, "number", "Font Size");
    FAChar.prototype.publishProxy("color_fill", "_text");

    FAChar.prototype.testData = function () {
        this.char("\uf007");
        return this;
    }

    FAChar.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._text
            .target(domNode)
        ;
    };

    FAChar.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        this._text
            .text(this._char)
            .scale((this.font_size() || 14) / 14) //  Scale rather than font_size to prevent Chrome glitch  ---
            .render()
        ;
    };

    return FAChar;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/IList',[], factory);
    } else {
        root.IList = factory();
    }
}(this, function () {
    function IList() {
    };

    //  Data ---
    IList.prototype.testData = function () {
        var data = ["This", "is a", "list", "of some text."];
        this.data(data);
        return this;
    };

    //  Properties  ---

    //  Events  ---
    IList.prototype.click = function (d) {
        console.log("Click:  " + d);
    };

    return IList;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/IMenu',[], factory);
    } else {
        root.IMenu = factory();
    }
}(this, function () {
    function IMenu() {
    };

    //  Data ---
    IMenu.prototype.testData = function () {
        var data = ["This", "is a", "list", "of some text."];
        this.data(data);
        return this;
    };

    //  Properties  ---

    //  Events  ---
    IMenu.prototype.click = function (d) {
        console.log("Click:  " + d);
    };
    IMenu.prototype.preShowMenu = function () {
        console.log("preShowMenu");
    };
    IMenu.prototype.postHideMenu = function (d) {
        console.log("postHideMenu");
    };

    return IMenu;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Shape.js',["./SVGWidget", "css!./Shape"], factory);
    } else {
        root.Entity = factory(root.SVGWidget);
    }
}(this, function (SVGWidget) {
    function Shape() {
        SVGWidget.call(this);
        this._class = "common_Shape";
    };
    Shape.prototype = Object.create(SVGWidget.prototype);

    Shape.prototype.publish("shape", "circle", "set", "Shape Type", ["circle", "square", "rect", "ellipse"]);
    Shape.prototype.publish("width", 24, "number", "Width");
    Shape.prototype.publish("height", 24, "number", "Height");
    Shape.prototype.publish("color_stroke", null, "html-color", "Stroke Color", null);
    Shape.prototype.publish("color_fill", null, "html-color", "Fill Color", null);

    Shape.prototype.radius = function (_) {
        if (!arguments.length) return Math.max(this._width, this._height) / 2;
        this._width = _;
        this._height = _;
        return this;
    };

    Shape.prototype.testData = function () {
        return this;
    }

    Shape.prototype.intersection = function (pointA, pointB) {
        switch (this._shape) {
            case "circle":
                return this.intersectCircle(pointA, pointB);
        }
        return SVGWidget.prototype.intersection.apply(this, arguments);
    };

    Shape.prototype.update = function (domNode, element) {
        var shape = element.selectAll("rect,circle,ellipse").data([this._shape], function (d) { return d; });
        
        shape.enter().append(this._shape === "square" ? "rect" : this._shape)
            .attr("class", "common_Shape")
        ;
        var context = this;
        shape.each(function (d) {
            var element = d3.select(this);
            element.style({
                fill: context._color_fill !== context.__meta_color_fill.defaultValue ? context._color_fill : null,
                stroke: context._color_stroke !== context.__meta_color_stroke.defaultValue ? context._color_stroke : null
            });
            switch (context._shape) {
                case "circle":
                    var radius = context.radius();
                    element
                        .attr("r", radius)
                    ;
                    break;
                case "square":
                    var width = Math.max(context._width, context._height);
                    element
                        .attr("x", -width / 2)
                        .attr("y", -width / 2)
                        .attr("width", width)
                        .attr("height", width)
                    ;
                    break;
                case "rect":
                    element
                        .attr("x", -context._width / 2)
                        .attr("y", -context._height / 2)
                        .attr("width", context._width)
                        .attr("height", context._height)
                    ;
                    break;
                case "ellipse":
                    element
                        .attr("rx", context._width / 2)
                        .attr("ry", context._height / 2)
                    ;
                    break;
            }
        });
        shape.exit().remove();
    };

    return Shape;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Icon',["./SVGWidget", "./Shape", "./FAChar", "css!./Icon"], factory);
    } else {
        root.Entity = factory(root.SVGWidget, root.Shape, root.FAChar);
    }
}(this, function (SVGWidget, Shape, FAChar) {
    function Icon() {
        SVGWidget.call(this);
        this._class = "common_Icon";

        this._shapeWidget = new Shape();
        this._faChar = new FAChar();
    };
    Icon.prototype = Object.create(SVGWidget.prototype);    

    Icon.prototype.publish("shape", "circle", "set", "Shape Type", ["circle", "square"]);
    Icon.prototype.publishProxy("faChar", "_faChar", "char");
    Icon.prototype.publishProxy("image_color_fill", "_faChar", "color_fill");
    Icon.prototype.publish("tooltip", "", "string", "Tooltip");
    Icon.prototype.publish("diameter", 24, "number", "Diameter");
    Icon.prototype.publish("padding_percent", 45, "number", "Padding Percent");
    Icon.prototype.publishProxy("shape_color_fill", "_shapeWidget", "color_fill");
    Icon.prototype.publishProxy("shape_color_stroke", "_shapeWidget", "color_stroke");

    Icon.prototype.testData = function () {
        this._faChar.testData();
        return this;
    };

    Icon.prototype.intersection = function (pointA, pointB) {
        return this._shapeWidget.intersection(pointA, pointB);
    };

    Icon.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._shapeWidget
            .target(domNode)
            .render()
        ;
        this._faChar
            .target(domNode)
            .render()
        ;
        this._tooltipElement = element.append("title");
    };

    Icon.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        this._faChar
            .font_size(this._diameter * (100 - this._padding_percent) / 100)
            .render()
        ;
        this._shapeWidget
            .shape(this._shape)
            .width(this._diameter)
            .height(this._diameter)
            .render()
        ;
        this._tooltipElement.text(this._tooltip);
    };

    return Icon;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/TextBox.js',["./SVGWidget", "./Shape", "./Text", "css!./TextBox"], factory);
    } else {
        root.Entity = factory(root.SVGWidget, root.Shape, root.Text);
    }
}(this, function (SVGWidget, Shape, Text) {
    function TextBox() {
        SVGWidget.call(this);
        this._class = "common_TextBox";

        this._shape = new Shape()
            .shape("rect")
        ;
        this._text = new Text();
    };
    TextBox.prototype = Object.create(SVGWidget.prototype);
    TextBox.prototype.publishProxy("text", "_text");
    TextBox.prototype.publishProxy("shape_color_stroke", "_shape", "color_stroke");
    TextBox.prototype.publishProxy("shape_color_fill", "_shape", "color_fill");
    TextBox.prototype.publishProxy("text_color_fill", "_text", "color_fill");
    TextBox.prototype.publish("padding_left", 4, "number", "Padding:  Left");
    TextBox.prototype.publish("padding_right", 4, "number", "Padding:  Right");
    TextBox.prototype.publish("padding_top", 4, "number", "Padding:  Top");
    TextBox.prototype.publish("padding_bottom", 4, "number", "Padding:  Bottom");
    TextBox.prototype.publishProxy("anchor", "_text");
    TextBox.prototype.publish("fixedSize", null);

    TextBox.prototype.padding = function (_) {
        this._padding_left = _;
        this._padding_right = _;
        this._padding_top = _;
        this._padding_bottom = _;
        return this;
    };

    TextBox.prototype.testData = function () {
        this._text.testData();
        return this;
    }

    TextBox.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._shape
            .target(domNode)
            .render()
        ;
        this._text
            .target(domNode)
            .render()
        ;
    };

    TextBox.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);

        this._text
            .render()
        ;
        var textBBox = this._text.getBBox(true);
        var size = {
            width: this._fixedSize ? this._fixedSize.width : textBBox.width + this._padding_left + this._padding_right,
            height: this._fixedSize ? this._fixedSize.height : textBBox.height + this._padding_top + this._padding_bottom
        };
        this._shape
            .width(size.width)
            .height(size.height)
            .render()
        ;
        if (this._fixedSize) {
            switch (this.anchor()) {
                case "start":
                    this._text
                        .x(-this._fixedSize.width / 2 + textBBox.width / 2 + (this._padding_left + this._padding_right) / 2)
                        .render()
                    ;
                    break;
                case "end":
                    this._text
                        .x(this._fixedSize.width / 2 - textBBox.width / 2 - (this._padding_left + this._padding_right) / 2)
                        .render()
                    ;
                    break;
            }
        }
    };

    return TextBox;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/List',["d3/d3", "../common/SVGWidget", "./IList", "../common/TextBox", "css!./List"], factory);
    } else {
        root.List = factory(root.d3, root.SVGWidget, root.IList, root.TextBox);
    }
}(this, function (d3, SVGWidget, IList, TextBox) {
    function List(target) {
        SVGWidget.call(this);
        IList.call(this);
        this._class = "common_List";

        this._listWidgets = {};
    };
    List.prototype = Object.create(SVGWidget.prototype);
    List.prototype.implements(IList.prototype);

    List.prototype.publish("anchor", "start", "set", "Anchor Position", ["", "start", "middle", "end"]);

    List.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        var context = this;

        var line = element.selectAll(".line").data(this._data, function (d) { return d; });
        line.enter().append("g")
            .attr("class", "line")
            .each(function (d) {
                var newTextBox = new TextBox()
                    .target(this)
                    .padding_top(0)
                    .padding_bottom(0)
                    .padding_left(8)
                    .padding_right(8)
                    .text(d)
                    .render()
                ;
                newTextBox.element()
                    .on("click", function (d) {
                        context.click(d.text());
                    })
                ;
                context._listWidgets[d] = newTextBox;
            })
        ;

        var listHeight = 0;
        var listWidth = 0;
        var listCount = 0;
        for (var key in this._listWidgets) {
            var bbox = this._listWidgets[key].getBBox();
            listHeight += bbox.height;
            if (listWidth < bbox.width)
                listWidth = bbox.width;
            ++listCount;
        }
        var lineHeight = listHeight / listCount;

        var xPos = -listWidth / 2;
        var yPos = -listHeight / 2;// + lineHeight / 2;
        line
            .each(function (d) {
                var widget = context._listWidgets[d];
                var bbox = widget.getBBox();
                widget
                    .pos({ x: 0, y: yPos + bbox.height / 2 })
                    .anchor(context._anchor)
                    .fixedSize({ width: listWidth, height: bbox.height })
                    .render()
                ;
                yPos += bbox.height;
            })
        ;
        line.exit()
            .remove()
            .each(function (d) {
                delete context._listWidgets[d];
            })
        ;
    };

    return List;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Menu',["./SVGWidget", "./IMenu", "./Icon", "./List", "css!./Menu"], factory);
    } else {
        root.Entity = factory(root.SVGWidget, root.IMenu, root.Icon, root.List);
    }
}(this, function (SVGWidget, IMenu, Icon, List) {
    function Menu() {
        SVGWidget.call(this);
        IMenu.call(this);
        this._class = "common_Menu";

        this._icon = new Icon()
            .shape("rect")
            .diameter(14)
        ;
        this._list = new List();

        var context = this;
        this._list.click = function (d) {
            d3.event.stopPropagation();
            context.hideMenu();
            context.click(d);
        };
        this._visible = false;
    };
    Menu.prototype = Object.create(SVGWidget.prototype);
    Menu.prototype.implements(IMenu.prototype);

    Menu.prototype.publishProxy("faChar", "_icon", null, "\uf0c9");
    Menu.prototype.publishProxy("padding_percent", "_icon", null, 10);

    Menu.prototype.toggleMenu = function () {
        if (!this._visible) {
            this.showMenu();
        } else {
            this.hideMenu();
        }
    };

    Menu.prototype.showMenu = function () {
        this.preShowMenu();
        this._visible = true;
        this._list
            .data(this._data)
            .render()
        ;

        var bbox = this._icon.getBBox(true);
        var menuBBox = this._list.getBBox(true);
        var pos = {
            x: bbox.width / 2 - menuBBox.width / 2,
            y: bbox.height / 2 + menuBBox.height / 2
        };
        this._list
            .move(pos)
        ;
        var context = this;
        d3.select("body")
            .on("click." + this._id, function () {
                console.log("click:  body - " + context._id)
                if (context._visible) {
                    context.hideMenu();
                }
            })
        ;
    };

    Menu.prototype.hideMenu = function () {
        d3.select("body")
            .on("click." + this._id, null)
        ;
        this._visible = false;
        this._list
            .data([])
            .render()
        ;
        this.postHideMenu();
    };

    Menu.prototype.testData = function () {
        this
            .data(["Menu A", "And B", "a longer C"])
        ;
        return this;
    }

    Menu.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);

        this._icon
            .target(domNode)
            .render()
        ;

        this._list
            .target(domNode)
            .render()
        ;

        var context = this;
        this._icon.element()
            .on("click", function (d) {
                d3.event.stopPropagation();
                context.toggleMenu();
            })
        ;
    };

    Menu.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        element
            .classed("disabled", this._data.length === 0)
        ;

        this._icon
            .faChar(this.faChar())
            .padding_percent(this.padding_percent())
            .render()
        ;
    };

    return Menu;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Surface.js',["./SVGWidget", "./Icon", "./Shape", "./Text", "./FAChar", "./Menu", "css!./Surface"], factory);
    } else {
        root.Graph = factory(root.SVGWidget, root.Icon, root.Shape, root.Text, root.FAChar, root.Menu);
    }
}(this, function (SVGWidget, Icon, Shape, Text, FAChar, Menu) {
    function Surface() {
        SVGWidget.call(this);
        this._class = "common_Surface";

        this._menuPadding = 2;
        this._icon = new Icon()
            .faChar("\uf07b")
            .padding_percent(50)
        ;
        this._container = new Shape()
            .class("container")
            .shape("rect")
        ;
        this._titleRect = new Shape()
            .class("title")
            .shape("rect")
        ;
        this._text = new Text()
            .class("title")
        ;
        this._menu = new Menu()
            .padding_percent(0)
        ;
        var context = this;
        this._menu.preShowMenu = function () {
            if (context._content && context._content.hasOverlay()) {
                context._content.visible(false);
            }
        }
        this._menu.postHideMenu = function () {
            if (context._content && context._content.hasOverlay()) {
                context._content.visible(true);
            }
        }

        this._showContent = true;
        this._content = null;
    };
    Surface.prototype = Object.create(SVGWidget.prototype);

    Surface.prototype.publish("show_title", true, "boolean", "Show Title");
    Surface.prototype.publish("title", "", "string", "Title");
    Surface.prototype.publishProxy("title_font_size", "_text", "font_size");
    Surface.prototype.publish("show_icon", true, "boolean", "Show Title");
    Surface.prototype.publishProxy("icon_faChar", "_icon", "faChar");
    Surface.prototype.publishProxy("icon_shape", "_icon", "shape");
    //Surface.prototype.publish("menu");
    Surface.prototype.publish("content", null, "widget", "Content");

    Surface.prototype.menu = function (_) {
        if (!arguments.length) return this._menu.data();
        this._menu.data(_);
        return this;
    };

    Surface.prototype.showContent = function (_) {
        if (!arguments.length) return this._showContent;
        this._showContent = _;
        if (this._content) {
            this._content.visible(this._showContent);
        }
        return this;
    };

    Surface.prototype.content = function (_) {
        if (!arguments.length) return this._content;
        this._content = _;
        switch (this._content.class()) {
            case "bar":
                this.icon_faChar("\uf080")
                break;
            case "bubble":
                this.icon_faChar("\uf192")
                break;
            case "pie":
                this.icon_faChar("\uf200")
                break;
            case "table":
                this.icon_faChar("\uf0ce")
                break;
        }

        return this;
    };

    Surface.prototype.testData = function () {
        this.title("Hello and welcome!");
        this.menu(["aaa", "bbb", "ccc"]);
        return this;
    }

    Surface.prototype.enter = function (_domNode, _element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        var element = _element.append("g").attr("class", "frame");
        var domNode = element.node();
        this._clipRect = element.append("defs").append("clipPath")
            .attr("id", this.id() + "_clip")
            .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this._size.width)
                .attr("height", this._size.height)
        ;
        this._titleRect
            .target(domNode)
            .render()
            .display(this._show_title && this._show_icon)
        ;
        this._icon
            .target(domNode)
            .render()
        ;
        var menuViz = false;
        this._menu
            .target(_domNode)
        ;
        this._text
            .target(domNode)
        ;
        this._container
            .target(domNode)
        ;
    };

    Surface.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);

        this._icon
            .display(this._show_title && this._show_icon)
            .render()
        ;
        this._menu
            .render()
        ;
        this._text
            .text(this._title)
            .display(this._show_title)
            .render()
        ;
        var iconClientSize = this._show_icon ? this._icon.getBBox(true) : {width:0, height: 0};
        var textClientSize = this._text.getBBox(true);
        var menuClientSize = this._menu.getBBox(true);
        var titleRegionHeight = Math.max(iconClientSize.height, textClientSize.height, menuClientSize.height);
        var yTitle = (-this._size.height + titleRegionHeight) / 2;

        var titleTextHeight = Math.max(textClientSize.height, menuClientSize.height);

        var topMargin = titleRegionHeight <= titleTextHeight ? 0 : (titleRegionHeight - titleTextHeight) / 2;
        var leftMargin = topMargin;

        this._titleRect
            .pos({ x: leftMargin, y: yTitle })
            .width(this._size.width - leftMargin * 2)
            .height(titleTextHeight)
            .display(this._show_title)
            .render()
        ;
        this._icon
            .move({ x: -this._size.width / 2 + iconClientSize.width / 2, y: yTitle })
        ;
        this._menu
            .move({ x: this._size.width / 2 - menuClientSize.width / 2 - this._menuPadding, y: yTitle })
        ;
        this._text
            .move({ x: (iconClientSize.width / 2 - menuClientSize.width / 2) / 2, y: yTitle })
        ;
        if (this._show_title) {
            this._container
                .pos({ x: leftMargin / 2, y: titleRegionHeight / 2 - topMargin / 2 })
                .width(this._size.width - leftMargin)
                .height(this._size.height - titleRegionHeight + topMargin)
                .render()
            ;
        } else {
            this._container
                .pos({ x: 0, y: 0 })
                .width(this._size.width)
                .height(this._size.height)
                .render()
            ;
        }

        if (this._showContent) {
            var xOffset = leftMargin;
            var yOffset = titleRegionHeight - topMargin;
            var context = this;
            var content = element.selectAll(".content").data(this._content ? [this._content] : [], function (d) { return d._id; });
            content.enter().append("g")
                .attr("class", "content")
                .attr("clip-path", "url(#" + this.id() + "_clip)")
                .each(function (d) {
                    d.target(this);
                })
            ;
            content
                .each(function (d) {
                    var padding = {
                        left: 4,
                        top: 4,
                        right: 4,
                        bottom: 4
                    };
                    d
                        .pos({ x: xOffset / 2, y: yOffset / 2 })
                        .size({
                            width: context._size.width - xOffset - (padding.left + padding.right),
                            height: context._size.height - yOffset - (padding.top + padding.bottom)
                        })
                    ;
                })
            ;
            if (this._content) {
                this._clipRect
                    .attr("x", -this._size.width / 2 + xOffset)
                    .attr("y", -this._size.height / 2 + yOffset)
                    .attr("width", this._size.width - xOffset)
                    .attr("height", this._size.height - yOffset)
                ;
            }
            content.exit().transition()
                .each(function (d) { d.target(null); })
                .remove()
            ;
        }

        this._menu.element().node().parentNode.appendChild(this._menu.element().node());
    };

    Surface.prototype.exit = function (domNode, element) {
        if (this._content) {
            this._content.target(null);
        }
        SVGWidget.prototype.exit.apply(this, arguments);
    };

    Surface.prototype.render = function (callback) {
        if (!this._content) {
            SVGWidget.prototype.render.apply(this, arguments);
        }
        SVGWidget.prototype.render.call(this);
        var context = this;
        if (this._content) {
            this._content.render(function (contentWidget) {
                if (callback) {
                    callback(context);
                }
            });
        }
        return this;
    }

    Surface.prototype.intersection = function (pointA, pointB) {
        var hits = [];
        var i1 = this._icon.intersection(pointA, pointB, this._pos);
        if (i1) {
            hits.push({i: i1, d: this.distance(i1, pointB)});
        }
        var i2 = this._titleRect.intersection(pointA, pointB);
        if (i2) {
            hits.push({i: i2, d: this.distance(i2, pointB)});
        }
        var i3 = this._container.intersection(pointA, pointB);
        if (i3) {
            hits.push({i: i3, d: this.distance(i3, pointB)});
        }
        var nearest = null;
        hits.forEach(function (item) {
            if (nearest === null || nearest.d > item.d) {
                nearest = item;
            }
        });
        return nearest && nearest.i ? nearest.i : null;
    };

    return Surface;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/ResizeSurface',["./Surface", "css!./ResizeSurface"], factory);
    } else {
        root.Graph = factory(root.Surface);
    }
}(this, function (Surface) {
    function ResizeSurface() {
        Surface.call(this);

        this.handleWidth = 8;
        this.handles = [{ loc: "NW" }, { loc: "N" }, { loc: "NE" }, { loc: "E" }, { loc: "SE" }, { loc: "S" }, { loc: "SW" }, { loc: "W" }];

        this._allowResize = true;

        var context = this;
        this.dispatch = d3.dispatch("sizestart", "size", "sizeend");
        this.drag = d3.behavior.drag()
            .origin(function (d) { return d; })
            .on("dragstart", function (d) {
                context.dispatch.sizestart(context, d.loc);
                if (context._allowResize) {
                    d3.event.sourceEvent.stopPropagation();
                    context._dragHandlePos = { x: d.x, y: d.y };
                    context._dragStartPos = context.pos();
                    context._dragStartSize = context.size();
                    context._prevPosSize = {
                        x: context._dragStartPos.x,
                        y: context._dragStartPos.y,
                        width: context._dragStartSize.width,
                        height: context._dragStartSize.height
                    }
                    context._textPosSize = context._text.getBBox(true);
                    context._iconPosSize = context._icon.getBBox(true);
                    context.showContent(false);
                }
            })
            .on("drag", function (d) {
                if (context._allowResize) {
                    d3.event.sourceEvent.stopPropagation();
                    var _dx = d3.event.x - context._dragHandlePos.x;
                    var _dy = d3.event.y - context._dragHandlePos.y;
                    var delta = { x: 0, y: 0, w: 0, h: 0 };
                    switch (d.loc) {
                        case "NW":
                            delta.x = _dx / 2;
                            delta.w = -_dx;
                        case "N":
                            delta.y = _dy / 2;
                            delta.h = -_dy;
                            break;
                        case "NE":
                            delta.y = _dy / 2;
                            delta.h = -_dy;
                        case "E":
                            delta.x = _dx / 2;
                            delta.w = _dx;
                            break;
                        case "SE":
                            delta.x = _dx / 2;
                            delta.w = _dx;
                        case "S":
                            delta.y = _dy / 2;
                            delta.h = _dy;
                            break;
                        case "SW":
                            delta.y = _dy / 2;
                            delta.h = _dy;
                        case "W":
                            delta.x = _dx / 2;
                            delta.w = -_dx;
                            break;
                    }
                    var posSize = {
                        x: context._dragStartPos.x + delta.x,
                        y: context._dragStartPos.y + delta.y,
                        width: context._dragStartSize.width + delta.w,
                        height: context._dragStartSize.height + delta.h
                    };
                    if (posSize.width < context._iconPosSize.width * 2 + context._textPosSize.width) {
                        posSize.x = context._prevPosSize.x;
                        posSize.width = context._prevPosSize.width;
                    }
                    if (posSize.height < context._textPosSize.height + 48) {
                        posSize.y = context._prevPosSize.y;
                        posSize.height = context._prevPosSize.height;
                    }
                    context
                        .pos({ x: posSize.x, y: posSize.y }, false, false)
                        .size({ width: posSize.width, height: posSize.height })
                        .render()
                        .getBBox(true)
                    ;
                    context.dispatch.size(context, d.loc);
                    context._prevPosSize = posSize;
                }
            })
            .on("dragend", function (d) {
                if (context._allowResize) {
                    d3.event.sourceEvent.stopPropagation();
                    context
                        .showContent(true)
                        .render()
                    ;
                    context._container.getBBox(true);
                    context._titleRect.getBBox(true);
                    context.dispatch.sizeend(context, d.loc);
                }
            })
        ;
    };
    ResizeSurface.prototype = Object.create(Surface.prototype);

    ResizeSurface.prototype.allowResize = function (_) {
        if (!arguments.length) return this._allowResize;
        this._allowResize = _;
        return this;
    };

    ResizeSurface.prototype.move = function (_) {
        var retVal = Surface.prototype.move.apply(this, arguments);
        this.updateHandles(this._domNode, this._element);
        return retVal;
    };

    ResizeSurface.prototype.update = function (domNode, element) {
        Surface.prototype.update.apply(this, arguments);
        this.updateHandles(domNode, element);
    };

    ResizeSurface.prototype.updateHandles = function (domNode, element) {
        var sizeHandles = this._parentElement.selectAll("rect").data(this.handles, function (d) { return d.loc; });
        sizeHandles.enter().append("rect")
            .attr("class", function (d) { return "resize" + d.loc; })
            .call(this.drag)
        ;

        var l = this._pos.x + this._container._pos.x - this._container.width() / 2;
        var t = this._pos.y + this._titleRect._pos.y - this._titleRect.height() / 2;
        var r = this._pos.x + this._container._pos.x + this._container.width() / 2;
        var b = this._pos.y + this._container._pos.y + this._container.height() / 2;
        var w = r - l;
        var h = b - t;
        var context = this;
        sizeHandles
            .each(function (d) {
                switch (d.loc) {
                    case "NW":
                        d.x = l - context.handleWidth / 2;
                        d.y = t - context.handleWidth / 2;
                        d.width = context.handleWidth;
                        d.height = context.handleWidth;
                        break;
                    case "N":
                        d.x = l + context.handleWidth / 2;
                        d.y = t - context.handleWidth / 2;
                        d.width = w - context.handleWidth;
                        d.height = context.handleWidth;
                        break;
                    case "NE":
                        d.x = r - context.handleWidth / 2;
                        d.y = t - context.handleWidth / 2;
                        d.width = context.handleWidth;
                        d.height = context.handleWidth;
                        break;
                    case "E":
                        d.x = r - context.handleWidth / 2;
                        d.y = t + context.handleWidth / 2;
                        d.width = context.handleWidth;
                        d.height = h - context.handleWidth;
                        break;
                    case "SE":
                        d.x = r - context.handleWidth / 2;
                        d.y = b - context.handleWidth / 2;
                        d.width = context.handleWidth;
                        d.height = context.handleWidth;
                        break;
                    case "S":
                        d.x = l + context.handleWidth / 2;
                        d.y = b - context.handleWidth / 2;
                        d.width = w - context.handleWidth;
                        d.height = context.handleWidth;
                        break;
                    case "SW":
                        d.x = l - context.handleWidth / 2;
                        d.y = b - context.handleWidth / 2;
                        d.width = context.handleWidth;
                        d.height = context.handleWidth;
                        break;
                    case "W":
                        d.x = l - context.handleWidth / 2;
                        d.y = t + context.handleWidth / 2;
                        d.width = context.handleWidth;
                        d.height = h - context.handleWidth;
                        break;
                }
                d3.select(this)
                    .attr("x", d.x)
                    .attr("y", d.y)
                    .attr("width", d.width)
                    .attr("height", d.height)
                ;
            })
        ;
    };

    return ResizeSurface;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/Bubble.js',["d3/d3", "../common/SVGWidget", "./I2DChart", "../common/Text", "../common/FAChar", "css!./Bubble"], factory);
    } else {
        root.Bubble = factory(root.d3, root.SVGWidget, root.I2DChart, root.Text, root.FAChar);
    }
}(this, function (d3, SVGWidget, I2DChart, Text, FAChar) {
    function Bubble(target) {
        SVGWidget.call(this);
        I2DChart.call(this);
        this._class = "chart_Bubble";

        this.labelWidgets = {};

        this.d3Pack = d3.layout.pack()
            .sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; })
            .size([this.width(), this.height()])
            .value(function (d) { return d[1]; })
        ;
    };
    Bubble.prototype = Object.create(SVGWidget.prototype);
    Bubble.prototype.implements(I2DChart.prototype);
	
    Bubble.prototype.publish("paletteID", "default", "set", "Palette ID", Bubble.prototype._palette.switch());
	
    Bubble.prototype.size = function (_) {
        var retVal = SVGWidget.prototype.size.apply(this, arguments);
        if (arguments.length) {
            this.d3Pack
                .size([this.width(), this.height()])
            ;
        }
        return retVal;
    };

    Bubble.prototype.update = function (domNode, element) {
        var context = this;

        this._palette = this._palette.switch(this._paletteID);
        var node = element.selectAll(".node")
            .data(this._data.length ? this.d3Pack.nodes({ children: this.cloneData() }).filter(function (d) { return !d.children; }) : [], function (d) { return d[0]; })            
        ;

        //  Enter  ---
        node.enter().append("g")
            .attr("class", "node")
            .attr("opacity", 0)
            .on("click", function (d) {
                context.click(context.rowToObj(d), context._columns[1]);
            })
            .each(function (d) {
                var element = d3.select(this);
                element.append("circle")
                    .attr("r", function (d) { return d.r; })
                    .append("title")
                ;
                if (d.__viz_faChar) {
                    context.labelWidgets[d[0]] = new FAChar()
                        .char(d.__viz_faChar)
                        .target(this)
                        .render()
                    ;
                } else {
                    context.labelWidgets[d[0]] = new Text()
                        .text(d[0])
                        .target(this)
                        .render()
                    ;
                }
            })
        ;

        //  Update  ---
        node.transition()
            .attr("opacity", 1)
            .each(function (d) {
                var element = d3.select(this);
                var pos = { x: d.x - context._size.width / 2, y: d.y - context._size.height / 2 }
                element.select("circle").transition()
                    .attr("transform", function (d) { return "translate(" + pos.x + "," + pos.y + ")"; })
                    .style("fill", function (d) { return context._palette(d[0]); })
                    .attr("r", function (d) { return d.r; })
                    .select("title")
                        .text(function (d) { return d[0] + " (" + d[1] + ")"; })
                ;
                if (d.__viz_faChar) {
                    context.labelWidgets[d[0]]
                        .pos(pos)
                        .render()
                    ;
                } else {
                    var label = d[0];
                    var labelWidth = context.labelWidgets[d[0]].getBBox().width;
                    if (d.r * 2 < 16) {
                        label = "";
                    } else if (d.r * 2 < labelWidth) {
                        label = label[0] + "...";
                    }
                    context.labelWidgets[d[0]]
                        .pos(pos)
                        .text(label)
                        .render()
                    ;
                }
            })
        ;

        //  Exit  ---
        node.exit().transition()
            .style("opacity", 0)
            .remove()
        ;
    };

    return Bubble;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/XYAxis.js',["d3/d3", "../common/SVGWidget"], factory);
    } else {
        root.XYAxis = factory(root.d3, root.SVGWidget);
    }
}(this, function (d3, SVGWidget) {
    function XYAxis(target) {
        SVGWidget.call(this);

        this._xScale = "";
        this.parseDate = d3.time.format("%Y-%m-%d").parse;
    };
    XYAxis.prototype = Object.create(SVGWidget.prototype);

    XYAxis.prototype.xScale = function (_) {
        if (!arguments.length) return this._xScale;
        this._xScale = _;
        return this;
    };

    XYAxis.prototype.enter = function (domNode, element) {
        var context = this;

        this.x = null;
        switch (this._xScale) {
            case "DATE":
                this.x = d3.time.scale();
                break;
            default:
                this.x = d3.scale.ordinal();
                break;
        }
        this.y = d3.scale.linear();

        this.xAxis = d3.svg.axis()
            .orient("bottom")
            .scale(this.x)
        ;

        this.yAxis = d3.svg.axis()
            .orient("left")
            .scale(this.y)
            .tickFormat(d3.format(".2s"))
            .ticks(10)
        ;

        this.recenterG = element.append("g");
        this.svg = this.recenterG.append("g");
        this.svgData = this.svg.append("g");
        this.svgXAxis = this.svg.append("g")
            .attr("class", "x axis")
        ;
        this.svgYAxis = this.svg.append("g")
            .attr("class", "y axis")
        ;
    };

    XYAxis.prototype.calcMargin = function (domNode, element) {
        var context = this;
        var margin = { top: 8, right: 0, bottom: 24, left: 40 };
        var width = this.width() - margin.left - margin.right,
            height = this.height() - margin.top - margin.bottom;

        var test = element.append("g");

        var svgXAxis = test.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(this.xAxis)
        ;
        var svgYAxis = test.append("g")
            .attr("class", "y axis")
            .call(this.yAxis)
        ;

        var x_bbox = svgXAxis.node().getBBox();
        var y_bbox = svgYAxis.node().getBBox();
        margin.bottom = x_bbox.height;
        margin.left = y_bbox.width;
        test.remove();
        return margin;
    }

    XYAxis.prototype.update = function (domNode, element) {
        var context = this;

        //  Update Domain  ---
        switch (this._xScale) {
            case "DATE":
                var min = d3.min(this._data, function (data) {
                    return d3.min(data, function (d) { return context.parseDate(d[0]); });
                });
                var max = d3.max(this._data, function (data) {
                    return d3.max(data, function (d) { return context.parseDate(d[0]); });
                });
                this.x.domain([min, max]);
                break;
            default:
                this.x.domain(this._data.map(function (d) { return d[0]; }));
                break;
        }
        var min = d3.min(this._data, function (data) {
            return d3.min(data.filter(function (cell, i) { return i > 0 && context._columns[i] && context._columns[i].indexOf("__") !== 0; }), function (d) { return d; });
        });
        var max = d3.max(this._data, function (data) {
            return d3.max(data.filter(function (row, i) { return i > 0 && context._columns[i] && context._columns[i].indexOf("__") !== 0; }), function (d) { return d; });
        });
        var newMin = min - (max - min) / 10;
        if (min >= 0 && newMin < 0)
            newMin = 0;
        this.y.domain([newMin, max]);

        //  Calculate Range  ---
        if (this.x.rangeRoundBands) {
            this.x.rangeRoundBands([0, this.width()], .1);
        } else if (this.x.rangeRound) {
            this.x.range([0, this.width()]);
        }
        this.y.range([this.height(), 0]);
        var margin = this.calcMargin(domNode, element);

        //  Update Range  ---
        var width = this.width() - margin.left - margin.right,
            height = this.height() - margin.top - margin.bottom;

        if (this.x.rangeRoundBands) {
            this.x.rangeRoundBands([0, width], .1);
        } else if (this.x.rangeRound) {
            this.x.range([0, width]);
        }
        this.y.range([height, 0]);

        //  Render  ---
        this.svg.transition()
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        ;

        this.svgXAxis.transition()
            .attr("transform", "translate(0," + height + ")")
            .call(this.xAxis)
        ;

        this.svgYAxis.transition()
            .call(this.yAxis)
        ;

        this.updateChart(domNode, element, margin, width, height);

        this.recenterG.transition()
            .attr("transform", "translate(" + -this.width() / 2 + "," + -this.height() / 2 + ")")
        ;
    };

    XYAxis.prototype.updateChart = function (domNode, element, margin, width, height) {
    };

    return XYAxis;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/Column.js',["d3/d3", "./XYAxis", "./I2DChart", "css!./Column"], factory);
    } else {
        root.Column = factory(root.d3, root.XYAxis, root.I2DChart);
    }
}(this, function (d3, XYAxis, I2DChart) {
    function Column(target) {
        XYAxis.call(this);
        I2DChart.call(this);
        this._class = "chart_Column";
    };
    Column.prototype = Object.create(XYAxis.prototype);
    Column.prototype.implements(I2DChart.prototype);

    Column.prototype.publish("paletteID", "default", "set", "Palette ID", Column.prototype._palette.switch());

    Column.prototype.updateChart = function (domNode, element, margin, width, height) {
        var context = this;

        this._palette = this._palette.switch(this._paletteID);
        
        var column = this.svgData.selectAll(".columnRect")
            .data(this._data)
        ;

        var title = column
          .enter().append("rect")
            .attr("class", "columnRect")
            .on("click", function (d) {
                context.click(context.rowToObj(d), context._columns[1]);
            })
            .append("title")
        ;

        column.transition()
            .attr("class", "columnRect")
            .attr("x", function (d) { return context.x(d[0]); })
            .attr("width", this.x.rangeBand())
            .attr("y", function (d) { return context.y(d[1]); })
            .attr("height", function (d) { return height - context.y(d[1]); })
            .style("fill", function (d) { return context._palette(d[0]); })
        ;

        title
            .text(function (d) { return d[0] + " (" + d[1] + ")"; })
        ;

        column.exit().transition()
            .remove()
        ;
    };

    return Column;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/Line.js',["d3/d3", "./XYAxis", "./INDChart", "css!./Line"], factory);
    } else {
        root.Line = factory(root.d3, root.XYAxis, root.INDChart);
    }
}(this, function (d3, XYAxis, INDChart) {
    function Line(target) {
        XYAxis.call(this);
        INDChart.call(this);
        this._class = "chart_Line";
    };
    Line.prototype = Object.create(XYAxis.prototype);
    Line.prototype.implements(INDChart.prototype);
	
    Line.prototype.publish("paletteID", "default", "set", "Palette ID", Line.prototype._palette.switch());
	
    Line.prototype.enter = function (domNode, element) {
        XYAxis.prototype.enter.apply(this, arguments);
        var context = this;
    };

    Line.prototype.updateChart = function (domNode, element, margin, width, height) {
        var context = this;
		
        this._palette = this._palette.switch(this._paletteID);
        var d3Line = d3.svg.line()
            .x(function (d) {
                switch (context._xScale) {
                    case "DATE":
                        return context.x(context.parseDate(d[0]));
                }
                return context.x(d[0]) + (context.x.rangeBand ? context.x.rangeBand() / 2 : 0);
            })
            .y(function (d) { return context.y(d[1]); })
        ;

        var line = this.svgData.selectAll(".dataLine")
            .data(this._columns.filter(function(d, i) {return i > 0;}))
        ;

        line.enter().append("path")
            .attr("class", "dataLine")
        ;
        line 
            .style("stroke", function (d, i) {
                return context._palette(context._columns[i + 1]);
            })
            .append("title")
            .text(function(d) { return d; })
        ;
        line
            .datum(function (d, i) { return context._data.map(function (row, rowIdx) { return [row[0], row[i + 1]];}); })
            .attr("d", d3Line)
        ;

        line.exit().remove();
    };

    return Line;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Persist.js',["require"], factory);
    } else {
        root.Entity = factory();
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
        define('chart/MultiChart',["d3/d3", "../common/SVGWidget", "./INDChart", "../other/Persist", "require"], factory);
    } else {
        root.MultiChart = factory(root.d3, root.SVGWidget, root.INDChart, root.Persist, root.require);
    }
}(this, function (d3, SVGWidget, INDChart, Persist, require) {
    var _2dChartTypes = [
        { id: "BUBBLE", display: "Bubble", widgetClass: "chart_Bubble" },
        { id: "COLUMN", display: "Column", widgetClass: "chart_Column" },
        { id: "PIE", display: "Pie", widgetClass: "chart_Pie" },
        { id: "GOOGLE_PIE", display: "Pie (Google)", widgetClass: "google_Pie" },
        { id: "C3_PIE", display: "Pie (C3)", widgetClass: "c3_Pie" },
        { id: "C3_DONUT", display: "Donut (C3)", widgetClass: "c3_Donut" },
        { id: "WORD_CLOUD", display: "Word Cloud", widgetClass: "other_WordCloud" }
    ];
    var _multiChartTypes = [
        { id: "GOOGLE_BAR", display: "Bar (Google)", widgetClass: "google_Bar" },
        { id: "GOOGLE_COLUMN", display: "Column (Google)", widgetClass: "google_Column" },
        { id: "LINE", display: "Line", widgetClass: "chart_Line" },
        { id: "GOOGLE_LINE", display: "Line (Google)", widgetClass: "google_Line" },
        { id: "C3_LINE", display: "Line (C3)", widgetClass: "c3_Line" },
        { id: "C3_BAR", display: "Bar (C3)", widgetClass: "c3_Bar" },
        { id: "C3_COLUMN", display: "Column (C3)", widgetClass: "c3_Column" },
        { id: "C3_STEP", display: "Step (C3)", widgetClass: "c3_Step" },
        { id: "C3_AREA", display: "Area (C3)", widgetClass: "c3_Area" },
        { id: "C3_SCATTER", display: "Scatter (C3)", widgetClass: "c3_Scatter" }
    ];
    var _anyChartTypes = [
        { id: "TABLE", display: "Table", widgetClass: "other_Table" }
    ];
    var _allChartTypes = _2dChartTypes.concat(_multiChartTypes.concat(_anyChartTypes));

    function MultiChart() {
        SVGWidget.call(this);
        INDChart.call(this);
        this._class = "chart_MultiChart";

        this._chart = null;

        this._2dChartTypes = _2dChartTypes;
        this._multiChartTypes = _multiChartTypes;
        this._anyChartTypes = _anyChartTypes;
        this._allChartTypes = _allChartTypes;

        this._allCharts = {};
        this._allChartTypes.forEach(function (item) {
            var newItem = JSON.parse(JSON.stringify(item));
            newItem.widget = null;
            this._allCharts[item.id] = newItem;
            this._allCharts[item.display] = newItem;
            this._allCharts[item.widgetClass] = newItem;
        }, this);
        //  Backward compatability until we roll our own BAR  ---
        this._allCharts["BAR"] = this._allCharts["COLUMN"];
    };
    MultiChart.prototype = Object.create(SVGWidget.prototype);
    MultiChart.prototype.implements(INDChart.prototype);

    MultiChart.prototype.publish("chart_type", "BUBBLE", "set", "Chart Type", _allChartTypes.map(function (item) { return item.id; }));
    MultiChart.prototype.publish("chart", null, "widget", "Chart");

    MultiChart.prototype.columns = function (_) {
        var retVal = SVGWidget.prototype.columns.apply(this, arguments);
        if (arguments.length && this._chart) {
            this._chart.columns(_);
        }
        return retVal;
    };

    MultiChart.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length && this._chart) {
            this._chart.data(_);
        }
        return retVal;
    };

    MultiChart.prototype.hasOverlay = function () {
        return this._chart && this._chart.hasOverlay();
    };

    MultiChart.prototype.visible = function (_) {
        if (!arguments.length) return this._chart.visible();
        if (this._chart) {
            this._chart.visible(_);
        }
        return this;
    };

    MultiChart.prototype.requireContent = function (chartType, callback) {
        var retVal = this._allCharts[chartType].widget;
        if (retVal) {
            callback(retVal);
            return;
        }

        var context = this;
        var path = "../" + this._allCharts[chartType].widgetClass.split("_").join("/");
        require([path], function (widgetClass) {
            retVal = new widgetClass();
            context._allCharts[chartType].widget = retVal;
            callback(retVal);
        });
    };

    MultiChart.prototype.switchChart = function (callback) {
        var oldContent = this._chart;
        var context = this;
        this.requireContent(this._chart_type, function (newContent) {
            if (newContent !== oldContent) {
                var size = context.size();
                context._chart = newContent
                    .columns(context._columns)
                    .data(context._data)
                    .size(size)
                ;
                newContent.click = function (row, column) {
                    context.click(row, column);
                }
                if (oldContent) {
                    oldContent
                        .data([])
                        .size({ width: 1, height: 1 })
                        .render()
                    ;
                }
            }
            if (callback) {
                callback(this);
            }
        });
    };

    MultiChart.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        var content = element.selectAll(".multiChart").data(this._chart ? [this._chart] : [], function (d) { return d._id; });
        content.enter().append("g")
            .attr("class", "multiChart")
            .each(function (d) {
                d.target(this);
            })
        ;

        var size = this.size();
        content
            .each(function (d) {
                d
                    .size(size)
                    .render()
                ;
            })
        ;

        content.exit().transition()
            .each(function (d) { d.target(null); })
            .remove()
        ;
    };

    MultiChart.prototype.exit = function (domNode, element) {
        if (this._chart) {
            this._chart.target(null);
        }
        SVGWidget.prototype.exit.apply(this, arguments);
    };


    MultiChart.prototype.render = function (callback) {
        if (this._chart_type && (!this._chart || (this._chart._class !== this._allCharts[this._chart_type].widgetClass))) {
            var context = this;
            var args = arguments;
            this.switchChart(function () {
                SVGWidget.prototype.render.apply(context, args);
            });
            return this;
        }
        return SVGWidget.prototype.render.apply(this, arguments);
    }

    return MultiChart;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/MultiChartSurface',["d3/d3", "../common/ResizeSurface", "./MultiChart", "./INDChart"], factory);
    } else {
        root.MultiChartSurface = factory(root.d3, root.ResizeSurface, root.MultiChart, root.INDChart);
    }
}(this, function (d3, ResizeSurface, MultiChart, INDChart) {
    function MultiChartSurface() {
        ResizeSurface.call(this);
        INDChart.call(this);
        this.class = "chart_MultiChartSurface";

        this._title = "MultiChartSurface";
        this._content = new MultiChart();
        this._content.click = function (row, column) {
            context.click(row, column);
        }

        var context = this;
        this._menu.click = function (d) {
            context._content.chart_type(d).render();
        }
        this.mode("all");
    };
    MultiChartSurface.prototype = Object.create(ResizeSurface.prototype);
    MultiChartSurface.prototype.implements(INDChart.prototype);
    MultiChartSurface.prototype.testData = INDChart.prototype.testData;

    MultiChartSurface.prototype.publishProxy("chart_type", "_content");

    MultiChartSurface.prototype.columns = function (_) {
        if (!arguments.length) return this._content.columns();
        this._content.columns(_);
        return this;
    };

    MultiChartSurface.prototype.data = function (_) {
        if (!arguments.length) return this._content.data();
        this._content.data(_);
        return this;
    };

    MultiChartSurface.prototype.mode = function (_) {
        if (!arguments.length) return this._mode;
        this._mode = _;
        switch (this._mode) {
            case "2d":
                this.menu(this._content._2dChartTypes.concat(this._content._anyChartTypes).map(function (item) { return item.display; }).sort());
                break;
            case "multi":
                this.menu(this._content._multiChartTypes.concat(this._content._anyChartTypes).map(function (item) { return item.display; }).sort());
                break;
            case "all":
            default:
                this.menu(this._content._allChartTypes.map(function (item) { return item.display; }).sort());
        }
        return this;
    };

    return MultiChartSurface;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('chart/Pie',["d3/d3", "../common/SVGWidget", "./I2DChart", "../common/Text", "../common/FAChar", "css!./Pie"], factory);
    } else {
        root.Pie = factory(root.d3, root.SVGWidget, root.I2DChart, root.Text, root.FAChar);
    }
}(this, function (d3, SVGWidget, I2DChart, Text, FAChar) {
    function Pie(target) {
        SVGWidget.call(this);
        I2DChart.call(this);
        this._class = "chart_Pie";

        this._outerText = false;  //  Put label inside pie or outside (true/false)
        this._radius = 100;       // px
        this._innerRadius = 0;    // px

        this.labelWidgets = {};

        this.d3Pie = d3.layout.pie()
            .sort(function (a, b) {
                return a < b ? -1 : a > b ? 1 : 0;
            })
            .value(function (d) { return d[1]; })
        ;
        this.d3Arc = d3.svg.arc()
            .outerRadius(this._radius)
            .innerRadius(this._innerRadius)
        ;
    };
    Pie.prototype = Object.create(SVGWidget.prototype);
    Pie.prototype.implements(I2DChart.prototype);
	
    Pie.prototype.publish("paletteID", "default", "set", "Palette ID", Pie.prototype._palette.switch());
	
    Pie.prototype.size = function (_) {
        var retVal = SVGWidget.prototype.size.apply(this, arguments);
        if (arguments.length) {
            this.radius(Math.min(this._size.width, this._size.height) / 2);
        }
        return retVal;
    };

    Pie.prototype.radius = function (_) {
        if (!arguments.length) return this._radius;
        this.d3Arc.outerRadius(_);
        this._radius = _;
        return this;
    };

    Pie.prototype.innerRadius = function (_) {
        if (!arguments.length) return this._innerRadius;
        this.d3Arc.innerRadius(_);
        this._innerRadius = _;
        return this;
    };

    Pie.prototype.outerText = function (_) {
        if (!arguments.length) return this._outerText;
        this._outerText = _;
        return this;
    };

    Pie.prototype.intersection = function (pointA, pointB) {
        return this.intersectCircle(pointA, pointB);
    };

    Pie.prototype.update = function (domNode, element) {
        var context = this;
		
        this._palette = this._palette.switch(this._paletteID);
        var arc = element.selectAll(".arc").data(this.d3Pie(this._data), function (d) { return d.data[0]; });

        //  Enter  ---
        arc.enter().append("g")
            .attr("class", "arc")
            .attr("opacity", 0)
            .on("click", function (d) {
                context.click(context.rowToObj(d.data), context._columns[1]);
            })
            .each(function (d) {
                var element = d3.select(this);
                element.append("path")
                    .attr("d", context.d3Arc)
                    .append("title")
                ;
                if (d.data.__viz_faChar) {
                    context.labelWidgets[d.data[0]] = new FAChar()
                        .char(d.data.__viz_faChar)
                        .target(this)
                        .render()
                    ;
                } else {
                    context.labelWidgets[d.data[0]] = new Text()
                        .text(d.data[0])
                        .target(this)
                        .render()
                    ;
                }
            })
        ;

        //  Update  ---
        arc.transition()
            .attr("opacity", 1)
            .each(function (d) {
                var pos = { x: 0, y: 1 };
                if (context._outerText) {
                    var xFactor = Math.cos((d.startAngle + d.endAngle - Math.PI) / 2);
                    var yFactor = Math.sin((d.startAngle + d.endAngle - Math.PI) / 2);

                    var textBBox = context.labelWidgets[d.data[0]].getBBox();
                    var textOffset = Math.abs(xFactor) > Math.abs(yFactor) ? textBBox.width : textBBox.height;
                    pos.x = xFactor * (context._radius + textOffset);
                    pos.y = yFactor * (context._radius + textOffset);
                } else {
                    var centroid = context.d3Arc.centroid(d);
                    pos = { x: centroid[0], y: centroid[1] };
                }

                var element = d3.select(this);
                element.select("path").transition()
                    .attr("d", context.d3Arc)
                    .style("fill", function (d) { return context._palette(d.data[0]); })
                    .select("title")
                        .text(function (d) { return d.data[0] + " (" + d.data[1] + ")"; })
                ;
                context.labelWidgets[d.data[0]]
                    .pos(pos)
                    .render()
                    .element()
                        .classed("innerLabel", !context._outerText)
                        .classed("outerLabel", context._outerText)
                ;
            })
        ;

        //  Exit  ---
        arc.exit().transition()
            .style("opacity", 0)
            .remove()
        ;

        //  Label Lines  ---
        if (context._outerText) {
            var lines = element.selectAll("line").data(this.d3Pie(this._data), function (d) { return d.data[0]; });
            var r = this.radius();
            lines.enter().append("line")
              .attr("x1", 0)
              .attr("x2", 0)
              .attr("y1", -this._radius - 3)
              .attr("y2", -this._radius - 8)
              .attr("stroke", "gray")
              .attr("transform", function (d) {
                  return "rotate(" + (d.startAngle + d.endAngle) / 2 * (180 / Math.PI) + ")";
              });
            lines.transition()
              .attr("transform", function (d) {
                  return "rotate(" + (d.startAngle + d.endAngle) / 2 * (180 / Math.PI) + ")";
              });
            lines.exit().remove();
        }
    };

    return Pie;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('graph/Edge',["d3/d3", "../common/SVGWidget", "../common/TextBox", "css!./Edge"], factory);
    } else {
        root.Entity = factory(root.d3, root.SVGWidget, root.TextBox);
    }
}(this, function (d3, SVGWidget, TextBox) {
    function Edge() {
        SVGWidget.call(this);
        this._class = "graph_Edge";

        this._points = [];
        this._weight = 100;
        this._strokeDasharray = null;
        this._hidden = false;

        this._textBox = new TextBox()
            .padding(0)
        ;
    };
    Edge.prototype = Object.create(SVGWidget.prototype);

    Edge.prototype.sourceVertex = function (_) {
        if (!arguments.length) return this._sourceVertex;
        this._sourceVertex = _;
        return this;
    };

    Edge.prototype.targetVertex = function (_) {
        if (!arguments.length) return this._targetVertex;
        this._targetVertex = _;
        return this;
    };

    Edge.prototype.sourceMarker = function (_) {
        if (!arguments.length) return this._sourceMarker;
        this._sourceMarker = _;
        return this;
    };

    Edge.prototype.targetMarker = function (_) {
        if (!arguments.length) return this._targetMarker;
        this._targetMarker = _;
        return this;
    };

    Edge.prototype.weight = function (_) {
        if (!arguments.length) return this._weight;
        this._weight = _;
        return this;
    };

    Edge.prototype.strokeDasharray = function (_) {
        if (!arguments.length) return this._strokeDasharray;
        this._strokeDasharray = _;
        return this;
    };

    Edge.prototype.points = function (_, transitionDuration, skipPushMarkers) {
        if (!arguments.length) return this._points;
        this._points = _;
        if (this._elementPath) {
            this.update(null, this._element, transitionDuration, skipPushMarkers);
        }
        return this;
    };

    Edge.prototype.hidden = function (_) {
        if (!arguments.length) return this._hidden;
        this._hidden = _;
        return this;
    };

    Edge.prototype.text = function (_) {
        if (!arguments.length) return this._textBox.text();
        this._textBox.text(_);
        return this;
    };

    Edge.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._elementPath = element.append("path");

        if (this._sourceMarker) {
            this._elementPath.attr("marker-start", "url(#" + this._sourceMarker + ")");
        }
        if (this._targetMarker) {
            this._elementPath.attr("marker-end", "url(#" + this._targetMarker + ")");
        }
        if (this._textBox.text()) {
            this._textBox
                .target(domNode)
                .render();
            ;
        }
    };

    Edge.prototype.update = function (domNode, element, transitionDuration, skipPushMarkers) {
        SVGWidget.prototype.update.apply(this, arguments);
        var context = this;
        var pathElements = this._elementPath;

        if (this.svgMarkerGlitch && !skipPushMarkers) {
            element.transition().duration((transitionDuration ? transitionDuration : 0) + 100) 
                .each("start", function (d) {
                    context._pushMarkers(element, d);
                })
                .each("end", function (d) {
                    context._popMarkers(element, d);
                })
            ;
        }
        var points = context._calculateEdgePoints(this._sourceVertex, this._targetVertex, this._points);
        var line = "";
        if (this._points.length || transitionDuration || true) {
            line = d3.svg.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
                .interpolate("bundle")
                .tension(0.75)
                (points)
            ;
        } else {
            //  Faster but does not transition as well  ---
            var dx = points[2].x - points[0].x,
                        dy = points[2].y - points[0].y,
                        dr = Math.sqrt(dx * dx + dy * dy) * 2;
            line = "M" +
                        points[0].x + "," +
                        points[0].y + "A" +
                        dr + "," + dr + " 0 0,1 " +
                        points[2].x + "," +
                        points[2].y;
        }
        if (transitionDuration) {
            pathElements = pathElements.transition().duration(transitionDuration);
        }
        pathElements
            .attr("opacity", this._hidden ? 0 : 1)
            .attr("stroke-dasharray", this._strokeDasharray)
            .attr("d", line)
        ;

        if (this._textBox.text()) {
            this._textBox
                .move(this._findMidPoint(points), transitionDuration)
            ;
        }
    };

    Edge.prototype._findMidPoint = function (points) {
        var midIdx = points.length / 2;
        if (points.length % 2) {
            return points[Math.floor(midIdx)];
        } else if (points.length){
            var p0 = points[midIdx - 1];
            var p1 = points[midIdx];
            return { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        }
        return { x: 0, y: 0 };
    };

    Edge.prototype._calculateEdgePoints = function (source, target, _points) {
        var points = _points ? _points.slice() : [];
        var p0 = points.length === 0 ? target.pos() : points[0];
        var p1 = points.length === 0 ? source.pos() : points[points.length - 1];

        points.unshift(source.intersection(source._pos, p0));
        points.push(target.intersection(target._pos, p1));
        if (!points[0]) {
            points[0] = source._pos;
        }
        if (!points[points.length - 1]) {
            points[points.length - 1] = target._pos;
        }

        if (points.length === 2 && points[0] && points[1]) {
            var dx = points[0].x - points[1].x;
            var dy = points[0].y - points[1].y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist) {
                dx /= dist;
                dy /= dist;
                var midX = (points[0].x + points[1].x) / 2 - dist * dy / 8;
                var midY = (points[0].y + points[1].y) / 2 + dist * dx / 8;
                points = [{ x: points[0].x, y: points[0].y }, { x: midX, y: midY }, { x: points[1].x, y: points[1].y }];
            }
        }

        return points;
    };

    return Edge;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('graph/IGraph.js',[], factory);
    } else {
        root.IGraph = factory();
    }
}(this, function () {
    function IGraph() {
    };

    //  Events  ---
    IGraph.prototype.vertex_click = function (d) {
        console.log("Vertex Click: " + d.id());
    };

    IGraph.prototype.edge_click = function (d) {
        console.log("Edge Click: " + d.id());
    };

    return IGraph;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('graph/Vertex.js',["d3/d3", "../common/SVGWidget", "../common/Icon", "../common/TextBox", "css!./Vertex"], factory);
    } else {
        root.Entity = factory(root.d3, root.SVGWidget, root.Icon, root.TextBox);
    }
}(this, function (d3, SVGWidget, Icon, TextBox) {
    function Vertex() {
        SVGWidget.call(this);
        this._class = "graph_Vertex";

        this._icon = new Icon();
        this._textBox = new TextBox();
        this._annotationWidgets = {};
    };
    Vertex.prototype = Object.create(SVGWidget.prototype);

    Vertex.prototype.publishProxy("faChar", "_icon");
    Vertex.prototype.publishProxy("icon_shape_color_fill", "_icon", "shape_color_fill");
    Vertex.prototype.publishProxy("icon_shape_color_stroke", "_icon", "shape_color_stroke");
    Vertex.prototype.publishProxy("icon_image_color_fill", "_icon", "image_color_fill");

    Vertex.prototype.publishProxy("text", "_textBox");
    Vertex.prototype.publishProxy("anchor", "_textBox");
    Vertex.prototype.publishProxy("textbox_shape_color_stroke", "_textBox", "shape_color_stroke");
    Vertex.prototype.publishProxy("textbox_shape_color_fill", "_textBox", "shape_color_fill");
    Vertex.prototype.publishProxy("textbox_text_color_fill", "_textBox", "text_color_fill");

    Vertex.prototype.publish("annotation_diameter", 14, "number", "Annotation Diameter");
    Vertex.prototype.publish("annotation_spacing", 3, "number", "Annotation Spacing");
    Vertex.prototype.publish("annotation_icons", [], "array", "Annotations");

    Vertex.prototype.testData = function (_) {
        this._icon.testData();
        this._textBox.testData();
        this.annotation_icons([{ faChar: "\uf188", tooltip: "Test A", shape_color_fill: "white", image_color_fill: "Red" }, { faChar: "\uf0ad", tooltip: "Test B", shape_color_fill: "green", shape_color_stroke: "green", image_color_fill: "white" }, { faChar: "\uf193", tooltip: "Test C", shape_color_fill: "navy", shape_color_stroke: "navy", image_color_fill: "white" }])
        return this;
    };

    //  Render  ---
    Vertex.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        this._icon
            .target(domNode)
            .render()
        ;
        this._textBox
            .target(domNode)
            .render()
        ;
    };

    Vertex.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        this._icon.render();
        var iconClientSize = this._icon.getBBox(true);
        this._textBox.render();
        var bbox = this._textBox.getBBox(true);
        this._icon
            .move({ x: -(bbox.width / 2) + (iconClientSize.width / 3), y: -(bbox.height / 2) - (iconClientSize.height / 3) })
        ;

        var context = this;
        var annotations = element.selectAll(".annotation").data(this._annotation_icons);
        annotations.enter().append("g")
            .attr("class", "annotation")
            .each(function (d, idx) {
                context._annotationWidgets[idx] = new Icon()
                    .target(this)
                    .shape("square")
                ;
            })
        ;
        var xOffset = bbox.width / 2;
        var yOffset = bbox.height / 2;
        annotations
            .each(function (d, idx) {
                var annotationWidget = context._annotationWidgets[idx];
                var ddd = context.textbox_shape_color_stroke();
                annotationWidget
                    .diameter(context._annotation_diameter)
                    .shape_color_fill(context.textbox_shape_color_fill())
                    .shape_color_stroke(context.textbox_shape_color_stroke())
                ;
                for (var key in d) {
                    if (annotationWidget[key]) {
                        annotationWidget[key](d[key]);
                    }
                }
                annotationWidget.render();

                var aBBox = annotationWidget.getBBox(true);
                annotationWidget
                    .move({
                        x: xOffset - aBBox.width / 4,
                        y: yOffset + aBBox.height / 4
                    })
                ;
                xOffset -= aBBox.width + context._annotation_spacing;
            })
        ;
        annotations.exit()
            .each(function (d, idx) {
                var element = d3.select(this);
                delete context._annotationWidgets[idx];
                element.remove();
            })
        ;
    };

    //  Methods  ---
    Vertex.prototype.intersection = function (pointA, pointB) {
        var i1 = this._icon.intersection(pointA, pointB, this._pos);
        if (i1)
            return i1;
        var i2 = this._textBox.intersection(pointA, pointB, this._pos);
        if (i2)
            return i2;
        return null;
    };

    return Vertex;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('graph/GraphData.js',["lib/dagre/dagre"], factory);
    } else {
        root.GraphData = factory(root.dagre);
    }
}(this, function (dagre) {
    function GraphData() {
        dagre.graphlib.Graph.call(this, { multigraph: true, compound: true });
        this.setGraph({});
        this.setDefaultNodeLabel(function () { return {}; });
        this.setDefaultEdgeLabel(function () { return {}; });
    };
    GraphData.prototype = Object.create(dagre.graphlib.Graph.prototype);

    GraphData.prototype.setData = function (vertices, edges, hierarchy, merge) {
        var context = this;
        var retVal = {
            addedVertices: [],
            addedEdges: []
        }

        //  Add new items  ---
        for (var i = 0; i < vertices.length; ++i) {
            var entity = vertices[i];
            if (!merge || !this.hasNode(entity._id)) {
                this.setNode(entity._id, entity)
                retVal.addedVertices.push(entity);
            }
        }
        for (var i = 0; i < edges.length; ++i) {
            var edge = edges[i];
            if (!merge || !this.hasEdge(edge._id)) {
                this.setEdge(edge._sourceVertex._id, edge._targetVertex._id, edge);
                retVal.addedEdges.push(edge);
            }
        }
        if (hierarchy) {
            for (var i = 0; i < hierarchy.length; ++i) {
                this.setParent(hierarchy[i].child._id, hierarchy[i].parent._id);
            }
        }

        //  Remove old items  ---
        if (merge) {
            var edgeIDs = edges.map(function (item) { return item._id; });
            this.filterEdges(function (item) { return edgeIDs.indexOf(item.v + "_" + item.w) < 0; })
                .forEach(function (item) {
                    try {
                        //TODO:  context.delEdge(item);
                    } catch (e) {
                        var d = 0;
                    }
                })
            ;
            var vertexIDs = vertices.map(function (item) { return item._id; });
            this.filterNodes(function (item) { return vertexIDs.indexOf(item) < 0; })
                .forEach(function (item) {
                    try {
                        context.delNode(item);
                    } catch (e) {
                        var d = 0;
                    }
                })
            ;
        }
        return retVal;
    };

    GraphData.prototype.filterEdges = function (pred) {
        var filtered = [];
        this.eachEdge(function (e) {
            if (pred(e)) {
                filtered.push(e);
            }
        });
        return filtered;
    };

    GraphData.prototype.filterNodes = function (pred) {
        var filtered = [];
        this.eachNode(function (e) {
            if (pred(e)) {
                filtered.push(e);
            }
        });
        return filtered;
    };

    GraphData.prototype.nodeValues = function () {
        var retVal = [];
        this.nodes().forEach(function (item, idx) {
            retVal.push(this.node(item));
        }, this);
        return retVal;
    };

    GraphData.prototype.eachNode = function (callback) {
        this.nodes().forEach(function (item, idx) {
            callback(item, this.node(item));
        }, this);
    };

    GraphData.prototype.edgeValues = function () {
        var retVal = [];
        var context = this;
        this.edges().forEach(function (item, idx) {
            retVal.push(this.edge(item));
        }, this);
        return retVal;
    };

    GraphData.prototype.eachEdge = function (callback) {
        this.edges().forEach(function (item, idx) {
            callback(item, item.v, item.w, this.edge(item));
        }, this);
    };

    GraphData.prototype.getJSON = function () {
        var graphObj = dagre.graphlib.json.write(this);
        return JSON.stringify(graphObj, function (key, value) {
            if (key === "value") {
                if (value._text && value._text._text) {
                    return value._text._text;
                }
                return value._id;
            }
            return value;
        }, "  ");
    };

    return GraphData;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('graph/GraphLayouts.js',["lib/dagre/dagre"], factory);
    } else {
        root.GraphLayouts = factory(root.dagre);
    }
}(this, function (dagre) {
    function Circle(graphData, width, height, radius) {
        var context = this;
        this.pos = {};

        //  Initial Positions  ---
        var padding = 0;
        radius = radius || (width < height ? width - padding : height - padding) / 2;
        var order = graphData.nodeCount();
        var currStep = -Math.PI / 2;
        var step = 2 * Math.PI / order;
        graphData.eachNode(function (u, value) {
            var size = value.getBBox(true);
            var maxSize = Math.max(size.width, size.height)
            context.pos[u] = {
                x: value.fixed ? value.x : Math.cos(currStep) * (radius - maxSize),
                y: value.fixed ? value.y : Math.sin(currStep) * (radius - maxSize),
                width: size.width,
                height: size.height
            }
            currStep += step; 
        });
    };
    Circle.prototype.nodePos = function(u) {
        return this.pos[u];        
    };
    Circle.prototype.edgePoints = function(e) {
        return [];
    };

    function None(graphData, width, height, radius) {
        var context = this;
        this.pos = {};

        graphData.eachNode(function (u, value) {
            context.pos[u] = {
                x: value.x,
                y: value.y,
                width: value.width,
                height: value.height
            }
        });
    };
    None.prototype.nodePos = function (u) {
        return this.pos[u];
    };
    None.prototype.edgePoints = function (e) {
        return [];
    };

    function ForceDirected(graphData, width, height, oneShot) {
        var context = this;
        this.pos = {};

        this.vertices = [];
        this.vertexMap = {};
        graphData.eachNode(function (u) {
            var value = graphData.node(u);
            var size = value.getBBox(true);
            var newItem = {
                id: u,
                x: value.pos().x,
                y: value.pos().y,
                width: size.width,
                height: size.height,
                value: value
            };
            context.vertices.push(newItem);
            context.vertexMap[u] = newItem;
        });
        this.edges = [];
        graphData.eachEdge(function (e, s, t) {
            var value = graphData.edge(e);
            context.edges.push({
                source: context.vertexMap[s],
                target: context.vertexMap[t]
            });
        });
        this.force = d3.layout.force()
            .charge(function (d) {
                var cs = d.value.getBBox();
                return -25 * Math.max(cs.width, cs.height)
            })
            .linkDistance(300)
            .nodes(this.vertices)
            .links(this.edges)
        ;
        if (oneShot) {
            this.force.start();
            var total = graphData.nodeCount();
            total = Math.min(total * total, 500);
            for (var i = 0; i < total; ++i) {
                this.force.tick();
            }
            this.force.stop();
        }
    };
    ForceDirected.prototype.nodePos = function (u) {
        return this.vertexMap[u];
    };
    ForceDirected.prototype.edgePoints = function (e) {
        return [];
    };

    function Hierarchy(graphData, width, height, options) {
        var digraph = new dagre.graphlib.Graph({ multigraph: true, compound: true })
              .setGraph(options)
              .setDefaultNodeLabel(function () { return {}; })
              .setDefaultEdgeLabel(function () { return {}; })
        ;
        graphData.eachNode(function (u) {
            var value = graphData.node(u);
            var clientSize = value.getBBox();
            digraph.setNode(u, {
                width: clientSize.width,
                height: clientSize.height
            });
        });
        graphData.eachEdge(function (e, s, t) {
            var value = graphData.edge(e);
            digraph.setEdge(s, t, {
                weight: value.weight()
            });
        });
        graphData.eachNode(function (u) {
            digraph.setParent(u, graphData.parent(u));
        });
        this.dagreLayout = dagre.layout(digraph);
        var deltaX = -digraph.graph().width / 2;
        var deltaY = -digraph.graph().height / 2;
        digraph.nodes().forEach(function (u) {
            var value = digraph.node(u);
            value.x += deltaX;
            value.y += deltaY;
        });
        digraph.edges().forEach(function (e) {
            var value = digraph.edge(e);
            for (var i = 0; i < value.points.length; ++i) {
                value.points[i].x += deltaX;
                value.points[i].y += deltaY;
            }
        });
        this.digraph = digraph;
    };
    Hierarchy.prototype.nodePos = function (u) {
        return this.digraph.node(u);
    };
    Hierarchy.prototype.edgePoints = function (e) {
        return this.digraph.edge(e).points;
    };

    var Layouts = {
        None: None,
        Circle: Circle,
        ForceDirected: ForceDirected,
        Hierarchy: Hierarchy
    };

    return Layouts;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Bag.js',[], factory);
    } else {
        root.Entity = factory();
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
        define('graph/Graph',["d3/d3", "../common/SVGWidget", "./IGraph", "./Vertex", "./GraphData", "./GraphLayouts", "../other/Bag", "css!./Graph"], factory);
    } else {
        root.Graph = factory(root.d3, root.SVGWidget, root.IGraph, root.Vertex, root.GraphData, root.GraphLayouts, root.Bag);
    }
}(this, function (d3, SVGWidget, IGraph, Vertex, GraphData, GraphLayouts, Bag) {
    function Graph() {
        SVGWidget.call(this);
        IGraph.call(this);
        this._class = "graph_Graph";

        this.graphData = new GraphData();
        this._transitionDuration = 250;
        this.highlight = {
            zoom: 1.1,
            opacity: 0.33,
            edge: "1.25px",
            transition: this._transitionDuration
        };

        this._showEdges = true;
        this._highlightOnMouseOverVertex = false;
        this._highlightOnMouseOverEdge = false;
        this._shrinkToFitOnLayout = false;
        this._layout = "";
        this._hierarchyOptions = { };
        this._snapToGrid = 0;
        this._allowDragging = true;
        this._selection = new Bag.Selection();
    };
    Graph.prototype = Object.create(SVGWidget.prototype);
    Graph.prototype.implements(IGraph.prototype);
    
    //  Properties  ---
    Graph.prototype.getOffsetPos = function () {
        return { x: 0, y: 0 };
    }

    Graph.prototype.size = function (_) {
        var retVal = SVGWidget.prototype.size.apply(this, arguments);
        if (arguments.length && this._svgZoom) {
            this._svgZoom
                .attr("x", -this._size.width / 2)
                .attr("y", -this._size.height / 2)
                .attr("width", this._size.width)
                .attr("height", this._size.height)
            ;
        }
        return retVal;
    };

    Graph.prototype.clear = function () {
        this.data({ vertices: [], edges: [], hierarchy: [], merge: false });
    };

    Graph.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            if (!this._data.merge) {
                this.graphData = new GraphData();
                this._renderCount = 0;
            }
            var data = this.graphData.setData(this._data.vertices, this._data.edges, this._data.hierarchy, this._data.merge);

            var context = this;
            data.addedVertices.forEach(function (item) {
                item.pos({
                    x:  + Math.random() * 10 / 2 - 5,
                    y:  + Math.random() * 10 / 2 - 5
                });
            })
            data.addedEdges.forEach(function (item) {
                if (item._sourceMarker)
                    item._sourceMarker = context._id + "_" + item._sourceMarker;
                if (item._targetMarker)
                    item._targetMarker = context._id + "_" + item._targetMarker;
            })
        }
        return retVal;
    };

    Graph.prototype.showEdges = function (_) {
        if (!arguments.length) return this._showEdges;
        this._showEdges = _;
        return this;
    };

    Graph.prototype.highlightOnMouseOverVertex = function (_) {
        if (!arguments.length) return this._highlightOnMouseOverVertex;
        this._highlightOnMouseOverVertex = _;
        return this;
    };

    Graph.prototype.highlightOnMouseOverEdge = function (_) {
        if (!arguments.length) return this._highlightOnMouseOverEdge;
        this._highlightOnMouseOverEdge = _;
        return this;
    };

    Graph.prototype.shrinkToFitOnLayout = function (_) {
        if (!arguments.length) return this._shrinkToFitOnLayout;
        this._shrinkToFitOnLayout = _;
        return this;
    };

    Graph.prototype.hierarchyOptions = function (_) {
        if (!arguments.length) return this._hierarchyOptions;
        this._hierarchyOptions = _;
        return this;
    };

    Graph.prototype.snapToGrid = function (_) {
        if (!arguments.length) return this._snapToGrid;
        this._snapToGrid = _;
        return this;
    };

    Graph.prototype.allowDragging = function (_) {
        if (!arguments.length) return this._allowDragging;
        this._allowDragging = _;
        return this;
    };

    Graph.prototype.selection = function (_) {
        if (!arguments.length) return this._selection.get();
        this._selection.set(_);
        return this;
    };

    Graph.prototype.setZoom = function (translation, scale, transitionDuration) {
        if (this.zoom) {
            this.zoom.translate(translation);
            this.zoom.scale(scale);
            this.applyZoom(transitionDuration);
        }
    };

    Graph.prototype.applyZoom = function (transitionDuration) {
        if (d3.event && d3.event.sourceEvent && !d3.event.sourceEvent.ctrlKey && (d3.event.sourceEvent.type === "wheel" || d3.event.sourceEvent.type === "mousewheel" || d3.event.sourceEvent.type === "DOMMouseScroll")) {
            if (d3.event.sourceEvent.wheelDelta) {
                this.zoom.translate([this.prevTranslate[0], this.prevTranslate[1] + d3.event.sourceEvent.wheelDelta]);
                this.zoom.scale(this.prevScale);
            }
        }
        (transitionDuration ? this.svg.transition().duration(transitionDuration) : this.svg)
            .attr("transform", "translate(" + this.zoom.translate() + ")scale(" + this.zoom.scale() + ")")
        ;
        this.prevTranslate = this.zoom.translate();
        if (this.prevScale !== this.zoom.scale()) {
            this._fixIEMarkers();
            this.prevScale = this.zoom.scale();
        }
        this.brush.x(d3.scale.identity().domain([(-this.prevTranslate[0] - this._size.width / 2) * 1 / this.zoom.scale(), (-this.prevTranslate[0] + this._size.width / 2) * 1 / this.zoom.scale()]))
        this.brush.y(d3.scale.identity().domain([(-this.prevTranslate[1] - this._size.height / 2) * 1 / this.zoom.scale(), (-this.prevTranslate[1] + this._size.height / 2) * 1 / this.zoom.scale()]))
    };

    Graph.prototype.enter = function (domNode, element, d) {
        SVGWidget.prototype.enter.apply(this, arguments);
        var context = this;

        //  Zoom  ---
        this.prevTranslate = [0, 0];
        this.prevScale = 1;
        this.zoom = d3.behavior.zoom()
            .scaleExtent([0.01, 4])
            .on("zoomstart", function (args) {
                context.prevTranslate = context.zoom.translate();
                context.prevScale = context.zoom.scale();
                if (d3.event.sourceEvent && d3.event.sourceEvent.shiftKey && d3.event.sourceEvent.ctrlKey) {
                    context._zoomMode = "selection";
                } else if (d3.event.sourceEvent && d3.event.sourceEvent.shiftKey) {
                    context._zoomMode = "selection"; 
                    context._selection.clear();
                } else {
                    context._zoomMode = "zoom";
                }
                switch (context._zoomMode) {
                    case "selection":
                        element.select(".extent")
                            .style("visibility", null)
                        ;
                        break;
                    default:
                        element.select(".extent")
                            .style("visibility", "hidden")
                        ;
                        break;
                }
            })
            .on("zoomend", function (args) {
                switch (context._zoomMode) {
                    case "selection":
                        context.zoom.translate(context.prevTranslate);
                        context.zoom.scale(context.prevScale);
                        break;
                    default:
                        break;
                }
                context._svgBrush.call(context.brush.clear());
            })
            .on("zoom", function (d) {
                switch (context._zoomMode) {
                    case "selection":
                        break;
                    default:
                        context.applyZoom();
                        break;
                }
            })
        ;
        this.brush = d3.svg.brush()
            .x(d3.scale.identity().domain([-context._size.width / 2, context._size.width / 2]))
            .y(d3.scale.identity().domain([-context._size.height / 2, context._size.height / 2]))
            .on("brushstart", function (args) {
                switch (context._zoomMode) {
                    case "selection":
                        break;
                    default:
                        break;
                }
            })
            .on("brushend", function (args) {
                switch (context._zoomMode) {
                    case "selection":
                        var extent = d3.event.target.extent();
                        context.svgV.selectAll(".graphVertex").select("*")
                            .each(function (d) {
                                if (extent[0][0] <= d.x() && d.x() < extent[1][0] && extent[0][1] <= d.y() && d.y() < extent[1][1]) {
                                    context._selection.append(d);
                                }
                            })
                        ;
                        break;
                    default:
                        break;
                }
            })
            .on("brush", function () {
                switch (context._zoomMode) {
                    case "selection":
                        var zt = context.zoom.translate();
;                        console.log(zt[0]);
                        var extent = d3.event.target.extent();
                        context.svgV.selectAll(".graphVertex").select("*")
                            .classed("selected", function (d) {
                                return context._selection.isSelected(d) ||
                                    (extent[0][0] <= d.x() && d.x() < extent[1][0] && extent[0][1] <= d.y() && d.y() < extent[1][1]);
                            });
                        ;
                        break;
                    default:
                        break;
                }
            })
        ;

        //  Drag  ---
        function dragstart(d) {
            if (context._allowDragging) {
                d3.event.sourceEvent.stopPropagation();
                context._dragging = true;
                if (context.forceLayout) {
                    var forceNode = context.forceLayout.vertexMap[d.id()];
                    forceNode.fixed = true;
                }
                if (context.svgMarkerGlitch) {
                    context.graphData.nodeEdges(d.id()).forEach(function (id) {
                        var edge = context.graphData.edge(id);
                        context._pushMarkers(edge.element(), edge);
                    });
                }
            }
        }
        function drag(d) {
            if (context._allowDragging) {
                d3.event.sourceEvent.stopPropagation();
                d.move({ x: d3.event.x, y: d3.event.y });
                if (context.forceLayout) {
                    var forceNode = context.forceLayout.vertexMap[d.id()];
                    forceNode.fixed = true;
                    forceNode.x = forceNode.px = d3.event.x;
                    forceNode.y = forceNode.py = d3.event.y;
                }
                context.refreshIncidentEdges(d, true);
            }
        }
        function dragend(d) {
            if (context._allowDragging) {
                d3.event.sourceEvent.stopPropagation();
                context._dragging = false;
                if (context._snapToGrid) {
                    var snapLoc = d.calcSnap(context._snapToGrid);
                    d.move(snapLoc[0]);
                    context.refreshIncidentEdges(d, true);
                }
                if (context.forceLayout) {
                    var forceNode = context.forceLayout.vertexMap[d.id()];
                    forceNode.fixed = false;
                }
                if (context.svgMarkerGlitch) {
                    context.graphData.nodeEdges(d.id()).forEach(function (id) {
                        var edge = context.graphData.edge(id);
                        context._popMarkers(edge.element(), edge);
                    });
                };
            }
        }
        this.drag = d3.behavior.drag()
            .origin(function (d) {
                return d.pos();
            })
            .on("dragstart", dragstart)
            .on("dragend", dragend)
            .on("drag", drag)
        ;
        //  SVG  ---
        this._svgZoom = element.append("rect")
            .attr("class", "zoom")
            .attr("x", -this._size.width / 2)
            .attr("y", -this._size.height / 2)
            .attr("width", this._size.width)
            .attr("height", this._size.height)
        ;

        this.defs = element.append("defs");
        this.addMarkers();

        element.call(this.zoom);

        this.svg = element.append("g");
        this._svgBrush = this.svg.append("g").attr("class", "selectionBrush").call(this.brush);
        this._svgBrush.select(".background").style("cursor", null);
        context._svgBrush.call(context.brush.clear());
        this.svgC = this.svg.append("g").attr("id", this._id + "C");
        this.svgE = this.svg.append("g").attr("id", this._id + "E");
        this.svgV = this.svg.append("g").attr("id", this._id + "V");
    };

    Graph.prototype.getBounds = function (items, layoutEngine) {
        var vBounds = [[null, null], [null, null]];
        items.forEach(function (item) {
            var pos = layoutEngine ? layoutEngine.nodePos(item._id) : {x: item.x(), y: item.y(), width: item.width(), height: item.height()};
            var leftX = pos.x - pos.width / 2;
            var rightX = pos.x + pos.width / 2;
            var topY = pos.y - pos.height / 2;
            var bottomY = pos.y + pos.height / 2;
            if (vBounds[0][0] === null || vBounds[0][0] > leftX) {
                vBounds[0][0] = leftX;
            }
            if (vBounds[0][1] === null || vBounds[0][1] > topY) {
                vBounds[0][1] = topY;
            }
            if (vBounds[1][0] === null || vBounds[1][0] < rightX) {
                vBounds[1][0] = rightX;
            }
            if (vBounds[1][1] === null || vBounds[1][1] < bottomY) {
                vBounds[1][1] = bottomY;
            }
        });
        return vBounds;
    };

    Graph.prototype.getVertexBounds = function (layoutEngine) {
        return this.getBounds(this.graphData.nodeValues(), layoutEngine);
    };
        
    Graph.prototype.getSelectionBounds = function (layoutEngine) {
        return this.getBounds(this._selection.get(), layoutEngine);
    };

    Graph.prototype.shrinkToFit = function (bounds, transitionDuration) {
        var width = this.width();
        var height = this.height();

        var dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = 1.0 / Math.max(dx / width, dy / height);
        if (scale > 1) {
            scale = 1;
        }
        var translate = [-scale * x, -scale * y];
        this.setZoom(translate, scale, transitionDuration);
    };

    Graph.prototype.zoomToLevels = ["all", "width", "selection", "100%"];
    Graph.prototype.zoomTo = function (level, transitionDuration) {
        switch (level) {
            case "all":
                this.shrinkToFit(this.getVertexBounds(), transitionDuration);
                break;
            case "width":
                var bounds = this.getVertexBounds();
                bounds[0][1] = 0;
                bounds[1][1] = 0;
                this.shrinkToFit(bounds, transitionDuration);
                break;
            case "selection":
                this.shrinkToFit(this._selection.isEmpty() ? this.getVertexBounds() : this.getSelectionBounds(), transitionDuration);
                break;
            case "100%":
                this.zoom.scale(1.0);
                this.applyZoom(transitionDuration);
                break;
        }
    };

    Graph.prototype.centerOn = function (bounds, transitionDuration) {
        var x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2
        var translate = [x, y];
        this.setZoom(translate, 1, transitionDuration);
    };

    Graph.prototype.layout = function (_, transitionDuration) {
        if (!arguments.length) return this._layout;
        this._layout = _;
        if (this._renderCount) {
            if (this.forceLayout) {
                this.forceLayout.force.stop();
                this.forceLayout = null;
            }

            var context = this;
            var layoutEngine = this.getLayoutEngine();
            if (this._layout == "ForceDirected2") {
                this.forceLayout = layoutEngine;
                var context = this;
                this.forceLayout.force.on("tick", function (d) {
                    layoutEngine.vertices.forEach(function (item) {
                        var vertex = context.graphData.node(item.id);
                        if (item.fixed) {
                            item.x = item.px;
                            item.y = item.py;
                        } else {
                            item.px = item.x;
                            item.py = item.y;
                            vertex
                                .move({ x: item.x, y: item.y })
                            ;
                        }
                    });
                    context.graphData.edgeValues().forEach(function (item) {
                        item
                            .points([], false, false)
                        ;
                    });
                    if (context._shrinkToFitOnLayout) {
                        var vBounds = context.getVertexBounds(layoutEngine);
                        context.shrinkToFit(vBounds);
                    }
                });
                this.forceLayout.force.start();
            } else if (layoutEngine) {
                this.forceLayout = null;
                context._dragging = true;
                context.graphData.nodeValues().forEach(function (item) {
                    var pos = layoutEngine.nodePos(item._id);
                    item.move({ x: pos.x, y: pos.y }, transitionDuration);
                    if (pos.width && pos.height && !item.width() && !item.height()) {
                        item
                            .width(pos.width)
                            .height(pos.height)
                            .render()
                        ;
                    }
                });
                context.graphData.edgeValues().forEach(function (item) {
                    var points = layoutEngine.edgePoints({v: item._sourceVertex.id(), w: item._targetVertex.id()});
                    item
                        .points(points, transitionDuration)
                    ;
                });

                if (context._shrinkToFitOnLayout) {
                    var vBounds = context.getVertexBounds(layoutEngine);
                    context.shrinkToFit(vBounds, transitionDuration);
                }
                this._fixIEMarkers();
                setTimeout(function() {
                    context._dragging = false;
                }, transitionDuration ? transitionDuration + 50 : 50);  //  Prevents highlighting during morph  ---
            }
        }
        return this;
    };

    //  Render  ---
    Graph.prototype.update = function (domNode, element, d) {
        SVGWidget.prototype.update.apply(this, arguments);
        var context = this;

        //  Create  ---
        var vertexElements = this.svgV.selectAll("#" + this._id + "V > .graphVertex").data(this.graphData.nodeValues(), function (d) { return d.id(); });
        vertexElements.enter().append("g")
            .attr("class", "graphVertex")
            .style("opacity", 1e-6)
             //  TODO:  Events need to be optional  ---
            .on("click.selectionBag", function (d) {
                context._selection.click(d, d3.event);
            })
            .on("click", function (d) {
                context.vertex_click(d, d3.event);
            })
            .on("dblclick", function (d) {
                context.vertex_dblclick(d, d3.event);
            })
            .on("mouseover", function (d) {
                if (context._dragging)
                    return;
                context.vertex_mouseover(d3.select(this), d);
            })
            .on("mouseout", function (d) {
                if (context._dragging)
                    return;
                context.vertex_mouseout(d3.select(this), d);
            })
            .each(createV)
            .transition()
            .duration(750)
            .style("opacity", 1)
        ;
        function createV(d) {
            d
                .target(this)
                .render()
            ;
            d.element()
                .call(context.drag)
            ;
            if (d.dispatch) {
                d.dispatch.on("sizestart", function (d, loc) {
                    d.allowResize(context._allowDragging);
                    if (context._allowDragging) {
                        context._dragging = true;
                    }
                });
                d.dispatch.on("size", function (d, loc) {
                    context.refreshIncidentEdges(d, false);
                });
                d.dispatch.on("sizeend", function (d, loc) {
                    context._dragging = false;
                    if (context._snapToGrid) {
                        var snapLoc = d.calcSnap(context._snapToGrid);
                        d
                            .pos(snapLoc[0])
                            .size(snapLoc[1])
                            .render()
                        ;
                        context.refreshIncidentEdges(d, false);
                    }
                });
            }
        }

        var edgeElements = this.svgE.selectAll("#" + this._id + "E > .edge").data(this._showEdges ? this.graphData.edgeValues() : [], function (d) { return d.id(); });
        edgeElements.enter().append("g")
            .attr("class", "edge")
            .style("opacity", 1e-6)
            .on("click", function (d) {
                context.edge_click(d);
            })
            .on("mouseover", function (d) {
                if (context._dragging)
                    return;
                context.edge_mouseover(d3.select(this), d);
            })
            .on("mouseout", function (d) {
                if (context._dragging)
                    return;
                context.edge_mouseout(d3.select(this), d);
            })
            .each(createE)
            .transition()
            .duration(750)
            .style("opacity", 1)
        ;
        function createE(d) {
            d
                .target(this)
                .render()
            ;
        }

        //  Update  ---
        vertexElements
            .each(updateV)
        ;
        function updateV(d) {
            d
                .render()
            ;
        }

        edgeElements
            .each(updateE)
        ;
        function updateE(d) {
            d
                .render()
            ;
        }

        //  Exit  ---
        vertexElements.exit()
            .each(function (d) { d.target(null); })
            .remove()
        ;
        edgeElements.exit()
            .each(function (d) { d.target(null); })
            .remove()
        ;

        if (!this._renderCount++) {
            this.setZoom([0, 0], 1);
            this.layout(this.layout());
        }
    };

    //  Methods  ---
    Graph.prototype.getLayoutEngine = function () {
        switch (this._layout) {
            case "Circle":
                return new GraphLayouts.Circle(this.graphData, this._size.width, this._size.height);
            case "ForceDirected":
                return new GraphLayouts.ForceDirected(this.graphData, this._size.width, this._size.height, true);
            case "ForceDirected2":
                return new GraphLayouts.ForceDirected(this.graphData, this._size.width, this._size.height);
            case "Hierarchy":
                return new GraphLayouts.Hierarchy(this.graphData, this._size.width, this._size.height, this._hierarchyOptions);
        }
        return null;//new GraphLayouts.None(this.graphData, this._size.width, this._size.height);
    }

    Graph.prototype.getNeighborMap = function (vertex) {
        var vertices = {};
        var edges = {};

        if (vertex) {
            var edges = this.graphData.nodeEdges(vertex.id());
            for (var i = 0; i < edges.length; ++i) {
                var edge = this.graphData.edge(edges[i]);
                edges[edge.id()] = edge;
                if (edge._sourceVertex.id() !== vertex.id()) {
                    vertices[edge._sourceVertex.id()] = edge._sourceVertex;
                }
                if (edge._targetVertex.id() !== vertex.id()) {
                    vertices[edge._targetVertex.id()] = edge._targetVertex;
                }
            }
        }

        return {
            vertices: vertices,
            edges: edges
        };
    };

    Graph.prototype.highlightVerticies = function (vertexMap) {
        var context = this;
        var vertexElements = this.svgV.selectAll(".graphVertex");
        vertexElements.transition().duration(this.highlight.transition)
            .each("end", function (d) {
                if (vertexMap && vertexMap[d.id()]) {
                    if (d._parentElement.node() && d._parentElement.node().parentNode) {
                        d._parentElement.node().parentNode.appendChild(d._parentElement.node());
                    }
                }
            })
            .style("opacity", function (d) {
                if (!vertexMap || vertexMap[d.id()]) {
                    return 1;
                }
                return context.highlight.opacity;
            })
        ;
        //  Causes issues in IE  ---
        /*
        var zoomScale = this.zoom.scale();
        if (zoomScale > 1)
            zoomScale = 1;
        vertexElements.select(".textbox").transition().duration(this.highlight.transition)
            .attr("transform", function (d) {

                if (vertexMap && vertexMap[d.id()]) {
                    return "scale(" + context.highlight.zoom / zoomScale + ")";
                }
                return "scale(1)";
            })
        ;
        */
    };

    Graph.prototype.highlightEdges = function (edgeMap) {
        var context = this;
        var edgeElements = this.svgE.selectAll(".edge");
        edgeElements
            .style("stroke-width", function (o) {
                if (edgeMap && edgeMap[o.id()]) {
                    return context.highlight.edge;
                }
                return "1px";
            }).transition().duration(this.highlight.transition)
            .style("opacity", function (o) {
                if (!edgeMap || edgeMap[o.id()]) {
                    return 1;
                }
                return context.highlight.opacity;
            })
        ;
    };

    Graph.prototype.highlightVertex = function (element, d) {
        if (this._highlightOnMouseOverVertex) {
            if (d) {
                var highlight = this.getNeighborMap(d);
                highlight.vertices[d.id()] = d;
                this.highlightVerticies(highlight.vertices);
                this.highlightEdges(highlight.edges);
            } else {
                this.highlightVerticies(null);
                this.highlightEdges(null);
            }
        }
    };

    Graph.prototype.highlightEdge = function (element, d) {
        if (this._highlightOnMouseOverEdge) {
            if (d) {
                var vertices = {};
                vertices[d._sourceVertex.id()] = d._sourceVertex;
                vertices[d._targetVertex.id()] = d._targetVertex;
                var edges = {};
                edges[d.id()] = d;
                this.highlightVerticies(vertices);
                this.highlightEdges(edges);
            } else {
                this.highlightVerticies(null);
                this.highlightEdges(null);
            }
        }
    };

    Graph.prototype.refreshIncidentEdges = function (d, skipPushMarkers) {
        var context = this;
        this.graphData.nodeEdges(d.id()).forEach(function (id) {
            var edge = context.graphData.edge(id);
            edge
                .points([], false, skipPushMarkers)
            ;
        });
    };

    //  Events  ---
    Graph.prototype.vertex_click = function (d) {
        d._parentElement.node().parentNode.appendChild(d._parentElement.node());
        IGraph.prototype.vertex_click.apply(this, arguments);
    };

    Graph.prototype.vertex_dblclick = function (d) {
    };

    Graph.prototype.vertex_mouseover = function (element, d) {
        this.highlightVertex(element, d);
    };

    Graph.prototype.vertex_mouseout = function (d, self) {
        this.highlightVertex(null, null);
    };

    Graph.prototype.edge_mouseover = function (element, d) {
        this.highlightEdge(element, d);
    };

    Graph.prototype.edge_mouseout = function (d, self) {
        this.highlightEdge(null, null);
    };

    Graph.prototype.addMarkers = function (clearFirst) {
        if (clearFirst) {
            this.defs.select("#" + this._id + "_arrowHead").remove();
            this.defs.select("#" + this._id + "_circleFoot").remove();
            this.defs.select("#" + this._id + "_circleHead").remove();
        }
        this.defs.append("marker")
            .attr("class", "marker")
            .attr("id", this._id + "_arrowHead")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 10)
            .attr("refY", 5)
            .attr("markerWidth", 8)
            .attr("markerHeight", 8)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("polyline")
                .attr("points", "0,0 10,5 0,10 1,5");
        ;
        this.defs.append("marker")
            .attr("class", "marker")
            .attr("id",  this._id + "_circleFoot")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 1)
            .attr("refY", 5)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("circle")
                .attr("cx", 5)
                .attr("cy", 5)
                .attr("r", 4)
        ;
        this.defs.append("marker")
            .attr("class", "marker")
            .attr("id", this._id + "_circleHead")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 9)
            .attr("refY", 5)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("circle")
                .attr("cx", 5)
                .attr("cy", 5)
                .attr("r", 4)
        ;
    };

    return Graph;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('layout/Surface.js',["../common/HTMLWidget", "../chart/MultiChart", "../c3/Column", "../c3/Line", "css!./Surface"], factory);
    } else {
        root.Graph = factory(root.HTMLWidget, root.MultiChart, root.Column, root.Line);
    }
}(this, function (HTMLWidget, MultiChart, Column, Line) {
    function Surface() {
        HTMLWidget.call(this);
        this._class = "layout_Surface";

        this._tag = "div";
    };
    Surface.prototype = Object.create(HTMLWidget.prototype);

    Surface.prototype.publish("title", "", "string", "Title");
    Surface.prototype.publish("widget", null, "widget", "Widget");

    Surface.prototype.testData = function () {
        this.title("ABC");
        this.widget(new Surface().widget(new MultiChart().testData()));
        return this;
    };

    Surface.prototype.enter = function (domNode, element) {
        HTMLWidget.prototype.enter.apply(this, arguments);
    };

    Surface.prototype.update = function (domNode, element) {
        HTMLWidget.prototype.update.apply(this, arguments);
        var titles = element.selectAll(".surfaceTitle").data(this._title ? [this._title] : []);
        titles.enter().insert("h3", "div")
            .attr("class", "surfaceTitle")
        ;
        titles
            .text(function (d) { return d; })
        ;
        titles.exit().remove();

        var widgets = element.selectAll("#" + this._id + " > .surfaceWidget").data(this._widget ? [this._widget] : [], function (d) { return d._id; });

        var context = this;
        widgets.enter().append("div")
            .attr("class", "surfaceWidget")
            .each(function (d) {
                //console.log("surface enter:" + d._class + d._id);
                d.target(this);
            })
        ;
        widgets
            .each(function (d) {
                //console.log("surface update:" + d._class + d._id);
                var width = context.clientWidth();
                var height = context.clientHeight();
                if (context._title) {
                    height -= context.calcHeight(element.select("h3"));
                }
                var widgetDiv = d3.select(this);
                height -= context.calcFrameHeight(widgetDiv);
                width -= context.calcFrameWidth(widgetDiv);
                d
                    .resize({ width: width, height: height })
                ;
            })
        ;
        widgets.exit().each(function (d) {
            //console.log("surface exit:" + d._class + d._id);
            d.target(null);
        }).remove();
    };

    Surface.prototype.exit = function (domNode, element) {
        if (this._widget) {
            this._widget = null;
            this.render();
        }
        HTMLWidget.prototype.exit.apply(this, arguments);
    };

    Surface.prototype.render = function (callback) {
        var context = this;
        HTMLWidget.prototype.render.call(this, function (widget) {
            if (context._widget) {
                context._widget.render(function (widget) {
                    if (callback) {
                        callback(widget);
                    }
                });
            } else {
                if (callback) {
                    callback(widget);
                }
            }
        });
    }

    return Surface;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('layout/Cell',["./Surface", "../chart/Pie", "../c3/Column", "../c3/Line", "css!./Cell"], factory);
    } else {
        root.Graph = factory(root.Surface, root.Pie, root.Column, root.Line);
    }
}(this, function (Surface, Pie, Column, Line) {
    function Cell() {
        Surface.call(this);
        this._class = "layout_Cell";
    };
    Cell.prototype = Object.create(Surface.prototype);

    Cell.prototype.publish("gridRow", 0, "number", "Grid Row Position");
    Cell.prototype.publish("gridCol", 0, "number", "Grid Column Position");
    Cell.prototype.publish("gridRowSpan", 1, "number", "Grid Row Span");
    Cell.prototype.publish("gridColSpan", 1, "number", "Grid Column Span");

    Cell.prototype.enter = function (domNode, element) {
        Surface.prototype.enter.apply(this, arguments);
        element.classed("layout_Surface", true);
    };

    return Cell;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('layout/Grid',["../common/HTMLWidget", "./Cell", "../common/Text", "../chart/Pie", "../chart/MultiChart", "../c3/Column", "../c3/Line", "css!./Grid"], factory);
    } else {
        root.Graph = factory(root.HTMLWidget, root.Cell, root.Text, root.Pie, root.MultiChart, root.Column, root.Line);
    }
}(this, function (HTMLWidget, Cell, Text, Pie, MultiChart, Column, Line) {
	function Grid() {
        HTMLWidget.call(this);
        this._class = "layout_Grid";

        this._tag = "div";

        this._content = [];
    };
    Grid.prototype = Object.create(HTMLWidget.prototype);

    Grid.prototype.publish("gutter", 4, "number", "Gap Between Widgets");
    Grid.prototype.publish("fitTo", "all", "set", "Sizing Strategy", ["all", "width"]);
    Grid.prototype.publish("content", [], "widgetArray", "widgets");

    Grid.prototype.testData = function () {
        this.setContent(0, 0, new Pie().testData())
        this.setContent(0, 1, new Pie().testData())
        this.setContent(1, 0, new Pie().testData())
        this.setContent(1, 1, new Pie().testData())
        this.setContent(0, 2, new MultiChart().testData(), "Title AAA", 2, 2)
        this.setContent(2, 0, new Line().testData(), "Title BBB", 2, 4)
        return this;
    };

    Grid.prototype.getDimensions = function () {
        var size = { width: 0, height: 0 };
        this._content.forEach(function (cell) {
            if (size.width < cell.gridCol() + cell.gridColSpan()) {
            	size.width = cell.gridCol() + cell.gridColSpan();
            }
            if (size.height < cell.gridRow() + cell.gridRowSpan()) {
            	size.height = cell.gridRow() + cell.gridRowSpan();
            }
        }, this);
        return size;
    };

    Grid.prototype.clearContent = function () {
        this._content = this._content.filter(function (contentWidget) {
            contentWidget.target(null);
            return false;
        });
    };

    Grid.prototype.setContent = function (row, col, widget, title, rowSpan, colSpan) {
        rowSpan = rowSpan || 1;
        colSpan = colSpan || 1;
        title = title || "";
        this._content = this._content.filter(function (contentWidget) {
            if (contentWidget._gridRow === row && contentWidget._gridCol === col) {
                contentWidget.target(null);
                return false;
            }
            return true;
        });

        if (widget) {
            var cell = new Cell()
                .gridRow(row)
                .gridCol(col)
                .widget(widget)
                .title(title)
                .gridRowSpan(rowSpan)
                .gridColSpan(colSpan)
            ;
            this._content.push(cell);
        }
        return this;
    };

    Grid.prototype.getContent = function (id) {
        var retVal = null;
        this._content.some(function (cell) {
            if (cell._widget._id === id) {
                retVal = cell._widget;
                return true;
            }
            return false;
        });
        return retVal;
    }

    Grid.prototype.childMoved = Grid.prototype.debounce(function (domNode, element) {
        this.render();
    }, 250);

    Grid.prototype.enter = function (domNode, element) {
        HTMLWidget.prototype.enter.apply(this, arguments);
        element.style("position", "relative");
        this._scrollBarWidth = this.getScrollbarWidth();
    };

    Grid.prototype.update = function (domNode, element) {
        HTMLWidget.prototype.update.apply(this, arguments);
        this._parentElement.style("overflow-x", this._fitTo === "width" ? "hidden" : null);
        this._parentElement.style("overflow-y", this._fitTo === "width" ? "scroll" : null);
        var dimensions = this.getDimensions();
        var cellWidth = (this.width() - (this._fitTo === "width" ? this._scrollBarWidth : 0)) / dimensions.width;
        var cellHeight = this._fitTo === "all" ? this.height() / dimensions.height : cellWidth;

        var context = this;
        var rows = element.selectAll(".cell_" + this._id).data(this._content, function (d) { return d._id; });
        rows.enter().append("div")
            .attr("class", "cell_" + this._id)
            .style("position", "absolute")
            .each(function (d) {
                //console.log("Grid :enter - " + d._class + d._id);
                d
                   .target(this)
                ;
                d.__grid_watch = d.watch(function (key, newVal, oldVal) {
                    if (context._renderCount && key.indexOf("grid") === 0 && newVal !== oldVal) {
                        context.childMoved();
                    }
                });
            })
        ;
        rows
            .style("left", function (d) { return d.gridCol() * cellWidth + context._gutter / 2 + "px"; })
            .style("top", function (d) { return d.gridRow() * cellHeight + context._gutter / 2 + "px"; })
            .style("width", function (d) { return d.gridColSpan() * cellWidth - context._gutter + "px"; })
            .style("height", function (d) { return d.gridRowSpan() * cellHeight - context._gutter + "px"; })
            .each(function (d) {
                //console.log("Grid :update - " + d._class + d._id);
                d
                    .resize()
                ;
            })
        ;
        rows.exit().each(function (d) {
            //console.log("Grid: exit - " + d._class + d._id);
            d
               .target(null)
            ;
            if (d.__grid_watch) {
                d.__grid_watch.remove();
            }
        }).remove();
    };

    Grid.prototype.exit = function (domNode, element) {
        HTMLWidget.prototype.exit.apply(this, arguments);
    };

    Grid.prototype.render = function (callback) {
        var context = this;
        HTMLWidget.prototype.render.call(this, function (widget) {
            if (context._content.length) {
                var renderCount = context._content.length;
                context._content.forEach(function (contentWidget, idx) {
                    setTimeout(function () {
                        contentWidget.render(function () {
                            if (--renderCount === 0) {
                                if (callback) {
                                    callback(widget);
                                }
                            }
                        });
                    }, 0);
                });
            } else {
                if (callback) {
                    callback(widget);
                }
            }
        });
        return this;
    }

    return Grid;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/IChoropleth.js',["../common/Palette"], factory);
    } else {
        root.IChoropleth = factory(root.Palette, root.usStates,root.usCounties);
    }
}(this, function (Palette, usStates, usCounties) {
    function IChoropleth() {
    };
    IChoropleth.prototype._palette = Palette.rainbow("default");
    
    //  Events  ---
    IChoropleth.prototype.click = function (row, column) {
        console.log("Click:  " + JSON.stringify(row) + ", " + column);
    };


    return IChoropleth;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/Choropleth.js',["d3/d3", "../common/SVGWidget", "./IChoropleth", "css!./Choropleth"], factory);
    } else {
        root.Choropleth = factory(root.d3, root.SVGWidget, root.IChoropleth);
    }
}(this, function (d3, SVGWidget, IChoropleth) {
    function Choropleth() {
        SVGWidget.call(this);
        IChoropleth.call(this);
        this._class = "map_Choropleth";

        this._dataMap = {};
        this._dataMinWeight = 0;
        this._dataMaxWeight = 0;
    };
    Choropleth.prototype = Object.create(SVGWidget.prototype);
    Choropleth.prototype.implements(IChoropleth.prototype);
    Choropleth.prototype.publish("paletteID", "YlOrRd", "set", "Palette ID", Choropleth.prototype._palette.switch());

    Choropleth.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this._dataMap = {};
            this._dataMinWeight = null;
            this._dataMaxWeight = null;

            var context = this;
            this._data.forEach(function (item) {
                context._dataMap[item[0]] = item;
                if (!context._dataMinWeight || item[1] < context._dataMinWeight) {
                    context._dataMinWeight = item[1];
                }
                if (!context._dataMaxWeight || item[1] > context._dataMaxWeight) {
                    context._dataMaxWeight = item[1];
                }
            });
        }
        return retVal;
    };

    Choropleth.prototype.size = function (_) {
        var retVal = SVGWidget.prototype.size.apply(this, arguments);
        if (arguments.length) {
            if (this._svgZoom) {
                this._svgZoom
                    .attr("x", -this._size.width / 2)
                    .attr("y", -this._size.height / 2)
                    .attr("width", this._size.width)
                    .attr("height", this._size.height)
                ;
            }
        }
        return retVal;
    }

    Choropleth.prototype.projection = function (_) {
        if (!arguments.length) return this._projection;
        this._projection = _;
        switch (this._projection) {
            case "albersUsaPr":
                this.d3Projection = this.albersUsaPr();
                break;
            case "orthographic":
                this.d3Projection = d3.geo.orthographic()
                    .clipAngle(90)
                ;
                break;
            case "mercator":
                this.d3Projection = d3.geo.mercator();
                break;
        }
        this.d3Path = d3.geo.path()
            .projection(this.d3Projection)
        ;
        return this;
    }

    Choropleth.prototype.render = function () {
        SVGWidget.prototype.render.apply(this, arguments);
        if (this._renderCount === 1) {
            this.zoomToFit();
        }
        return this;
    }

    Choropleth.prototype.enter = function (domNode, element) {
        //  Zoom  ---
        var context = this;
        this._svgZoom = element.append("rect")
            .attr("class", "zoom")
            .attr("x", -this._size.width / 2)
            .attr("y", -this._size.height / 2)
            .attr("width", this._size.width)
            .attr("height", this._size.height)
            .on("dblclick", function (d) {
                d3.event.stopPropagation();
                context.zoomToFit(null, 750);
            })
        ;

        var defs = this._parentElement.insert("defs", ":first-child");
        var g = defs.append("pattern")
            .attr('id', 'hash')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', '10')
            .attr('height', '10')
            .attr("x", 0).attr("y", 0)
            .append("g");
        g.append("rect")
            .attr("class", "noFill")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 5)
            .attr("height", 5)
        ;
        g.append("rect")
            .attr("class", "noFill")
            .attr("x", 5)
            .attr("y", 5)
            .attr("width", 5)
            .attr("height", 5)
        ;

        this._svg = element.append("g");
    };

    Choropleth.prototype.update = function (domNode, element) {
        this._palette = this._palette.switch(this._paletteID);
    };

    // A modified d3.geo.albersUsa to include Puerto Rico.
    Choropleth.prototype.albersUsaPr = function () {
        var ε = 1e-6;

        var lower48 = d3.geo.albers();

        // EPSG:3338
        var alaska = d3.geo.conicEqualArea()
            .rotate([154, 0])
            .center([-2, 58.5])
            .parallels([55, 65]);

        // ESRI:102007
        var hawaii = d3.geo.conicEqualArea()
            .rotate([157, 0])
            .center([-3, 19.9])
            .parallels([8, 18]);

        // XXX? You should check that this is a standard PR projection!
        var puertoRico = d3.geo.conicEqualArea()
            .rotate([66, 0])
            .center([0, 18])
            .parallels([8, 18]);

        var point,
            pointStream = { point: function (x, y) { point = [x, y]; } },
            lower48Point,
            alaskaPoint,
            hawaiiPoint,
            puertoRicoPoint;

        function albersUsa(coordinates) {
            var x = coordinates[0], y = coordinates[1];
            point = null;
            (lower48Point(x, y), point)
                || (alaskaPoint(x, y), point)
                || (hawaiiPoint(x, y), point)
                || (puertoRicoPoint(x, y), point);
            return point;
        }

        albersUsa.invert = function (coordinates) {
            var k = lower48.scale(),
                t = lower48.translate(),
                x = (coordinates[0] - t[0]) / k,
                y = (coordinates[1] - t[1]) / k;
            return (y >= .120 && y < .234 && x >= -.425 && x < -.214 ? alaska
                : y >= .166 && y < .234 && x >= -.214 && x < -.115 ? hawaii
                : y >= .204 && y < .234 && x >= .320 && x < .380 ? puertoRico
                : lower48).invert(coordinates);
        };

        // A naïve multi-projection stream.
        // The projections must have mutually exclusive clip regions on the sphere,
        // as this will avoid emitting interleaving lines and polygons.
        albersUsa.stream = function (stream) {
            var lower48Stream = lower48.stream(stream),
                alaskaStream = alaska.stream(stream),
                hawaiiStream = hawaii.stream(stream),
                puertoRicoStream = puertoRico.stream(stream);
            return {
                point: function (x, y) {
                    lower48Stream.point(x, y);
                    alaskaStream.point(x, y);
                    hawaiiStream.point(x, y);
                    puertoRicoStream.point(x, y);
                },
                sphere: function () {
                    lower48Stream.sphere();
                    alaskaStream.sphere();
                    hawaiiStream.sphere();
                    puertoRicoStream.sphere();
                },
                lineStart: function () {
                    lower48Stream.lineStart();
                    alaskaStream.lineStart();
                    hawaiiStream.lineStart();
                    puertoRicoStream.lineStart();
                },
                lineEnd: function () {
                    lower48Stream.lineEnd();
                    alaskaStream.lineEnd();
                    hawaiiStream.lineEnd();
                    puertoRicoStream.lineEnd();
                },
                polygonStart: function () {
                    lower48Stream.polygonStart();
                    alaskaStream.polygonStart();
                    hawaiiStream.polygonStart();
                    puertoRicoStream.polygonStart();
                },
                polygonEnd: function () {
                    lower48Stream.polygonEnd();
                    alaskaStream.polygonEnd();
                    hawaiiStream.polygonEnd();
                    puertoRicoStream.polygonEnd();
                }
            };
        };

        albersUsa.precision = function (_) {
            if (!arguments.length) return lower48.precision();
            lower48.precision(_);
            alaska.precision(_);
            hawaii.precision(_);
            puertoRico.precision(_);
            return albersUsa;
        };

        albersUsa.scale = function (_) {
            if (!arguments.length) return lower48.scale();
            lower48.scale(_);
            alaska.scale(_ * .35);
            hawaii.scale(_);
            puertoRico.scale(_);
            return albersUsa.translate(lower48.translate());
        };

        albersUsa.translate = function (_) {
            if (!arguments.length) return lower48.translate();
            var k = lower48.scale(), x = +_[0], y = +_[1];

            lower48Point = lower48
                .translate(_)
                .clipExtent([[x - .455 * k, y - .238 * k], [x + .455 * k, y + .238 * k]])
                .stream(pointStream).point;

            alaskaPoint = alaska
                .translate([x - .307 * k, y + .201 * k])
                .clipExtent([[x - .425 * k + ε, y + .120 * k + ε], [x - .214 * k - ε, y + .234 * k - ε]])
                .stream(pointStream).point;

            hawaiiPoint = hawaii
                .translate([x - .205 * k, y + .212 * k])
                .clipExtent([[x - .214 * k + ε, y + .166 * k + ε], [x - .115 * k - ε, y + .234 * k - ε]])
                .stream(pointStream).point;

            puertoRicoPoint = puertoRico
                .translate([x + .350 * k, y + .224 * k])
                .clipExtent([[x + .320 * k, y + .204 * k], [x + .380 * k, y + .234 * k]])
                .stream(pointStream).point;

            return albersUsa;
        };

        return albersUsa.scale(1070);
    }

    Choropleth.prototype.zoomToFit = function (node, transitionDuration, scaleFactor) {
        var scaleFactor = scaleFactor || 0.9;

        var bbox = node ? node.getBBox() : this._svg.node().getBBox();
        var x = bbox.x + bbox.width / 2;
        var y = bbox.y + bbox.height / 2;
        var scale = scaleFactor / Math.max(bbox.width / this.width(), bbox.height / this.height());
        var translate = [-scale * x, -scale * y];

        (transitionDuration ? this._svg.transition().duration(transitionDuration) : this._svg)
            .attr("transform", "translate(" + translate + ")scale(" + scale + ")")
        ;
    }

    return Choropleth;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/IGMap.js',["../common/Shape", "../graph/Edge"], factory);
    } else {
        root.IGMap = factory(root.Shape, root.Edge);
    }
}(this, function (Shape, Edge) {
    function IGMap() {
    };

    //  Data ---
    IGMap.prototype.testData = function () {
        var addresses = [
            { "geo_lat": "37.665074", "geo_long": "-122.384375", __viz_markerIcon: "green-dot.png" },
            { "geo_lat": "32.690680", "geo_long": "-117.178540" },
            { "geo_lat": "39.709455", "geo_long": "-104.969859" },
            { "geo_lat": "41.244123", "geo_long": "-95.961610" },
            { "geo_lat": "32.688980", "geo_long": "-117.192040" },
            { "geo_lat": "45.786490", "geo_long": "-108.526600" },
            { "geo_lat": "45.796180", "geo_long": "-108.535652" },
            { "geo_lat": "45.774320", "geo_long": "-108.494370" },
            { "geo_lat": "45.777062", "geo_long": "-108.549835", __viz_markerIcon: "red-dot.png" }
        ];
        var vertices = [];
        var edges = [];
        var prevAddr = null;
        addresses.forEach(function (item) {
            var newAddr = new Shape()
                .shape("circle")
                .radius(3)
                .data(item)
            ;
            vertices.push(newAddr);
            if (prevAddr) {
                edges.push(new Edge()
                    .sourceVertex(prevAddr)
                    .targetVertex(newAddr)
                    .targetMarker("arrowHead")
                );
            }
            prevAddr = newAddr;
        });
        this.data({ vertices: vertices, edges: edges });
        return this;
    };

    //  Properties  ---

    //  Events  ---
    IGMap.prototype.click = function (d) {
        console.log("Click:  " + d.label);
    };

    return IGMap;
}));




(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('map/GMap.js',["d3/d3", "../common/SVGWidget", "../graph/Graph", "./IGMap", "async!http://maps.google.com/maps/api/js?sensor=false", "css!./GMap"], factory);
    } else {
        root.GMap = factory(root.d3, root.SVGWidget, root.Graph, root.IGMap);
    }
}(this, function (d3, SVGWidget, Graph, IGMap) {
    function GMap(target) {
        Graph.call(this);
        IGMap.call(this);
        this._class = "map_GMap";
    };
    GMap.prototype = Object.create(Graph.prototype);
    GMap.prototype.implements(IGMap.prototype);

    GMap.prototype.enter = function (domNode, element, d) {
        Graph.prototype.enter.apply(this, arguments);

        this._googleMap = new google.maps.Map(d3.select(this._target).node(), {
            zoom: 3,
            center: new google.maps.LatLng(41.850033, -87.6500523),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        this._gmOverlay = new google.maps.OverlayView();

        var context = this;
        this._gmOverlay.onAdd = function () {
            context.layer = d3.select(this.getPanes().overlayLayer).append("div")
                .style("position", "absolute")
                .attr("class", "gmapLayer")
            ;
            //  Move SVG into Google Map Layer  ---
            context.layer.node().appendChild(context._parentElement.node());

            context._gmOverlay.draw = function () {
                var overlayProjection = context._gmOverlay.getProjection();

                var bounds_ = context._googleMap.getBounds();
                var sw = overlayProjection.fromLatLngToDivPixel(bounds_.getSouthWest());
                var ne = overlayProjection.fromLatLngToDivPixel(bounds_.getNorthEast());

                var div = context.layer.node();
                div.style.left = sw.x + "px";
                div.style.top = ne.y + "px";
                div.style.width = (ne.x - sw.x) + "px";
                div.style.height = (sw.y - ne.y) + "px";

                if (!context.firstRun) {
                    context.firstRun = true;
                    setTimeout(function () {
                        context.calcLatLong(sw.x, ne.y);
                        context.zoomToFit();
                    }, 100);
                } else {
                    context.calcLatLong(sw.x, ne.y);
                }
            };
            google.maps.event.addListener(context._googleMap, "center_changed", function () {
                context._gmOverlay.draw();
            });
        };
        this._gmOverlay.setMap(this._googleMap);
    };

    GMap.prototype.calcLatLong = function (dx, dy) {
        dx += this.width() / 2;
        dy += this.height() / 2;
        var projection = this._gmOverlay.getProjection();

        var context = this;
        this.graphData.nodeValues().forEach(function (item) {
            var pos = new google.maps.LatLng(item._data.geo_lat, item._data.geo_long);
            if (item._data.__viz_markerIcon && !item._marker) {
                item._marker = new google.maps.Marker({
                    position: pos,
                    animation: google.maps.Animation.DROP,
                    icon: "http://maps.google.com/mapfiles/ms/icons/" + item._data.__viz_markerIcon,
                    map: context._googleMap,
                });
            }
            pos = projection.fromLatLngToDivPixel(pos);
            pos.x -= dx;
            pos.y -= dy;
            item.move(pos);
        });
        this.graphData.edgeValues().forEach(function (item) {
            item.points([]);
        })
    };

    GMap.prototype.zoomToFit = function () {
        var latlngbounds = new google.maps.LatLngBounds();
        this.graphData.nodeValues().forEach(function (item) {
            var gLatLong = new google.maps.LatLng(item._data.geo_lat, item._data.geo_long);
            latlngbounds.extend(gLatLong);
        });
        this._googleMap.setCenter(latlngbounds.getCenter());
        this._googleMap.fitBounds(latlngbounds);
        return this;
    };

    return GMap;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Comms.js',[], factory);
    } else {
        root.Entity = factory();
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
        define('marshaller/HipieDDL.js',["../other/Comms", "../common/Widget"], factory);
    } else {
        root.Marshaller = factory(root.Comms, root.Widget);
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
        this.request = {
            refresh: refresh ? true : false
        };
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
        root.Graph = factory(root.d3, root.SVGWidget, root.TextBox, root.Surface, root.ResizeSurface, root.MultiChartSurface, root.Palette, root.GraphWidget, root.Vertex, root.Edge, root.HipieDDL);
    }
}(this, function (d3, SVGWidget, TextBox, Surface, ResizeSurface, MultiChartSurface, Palette, GraphWidget, Vertex, Edge, HipieDDL) {
    function createGraphData(marshaller, databomb, visualizeRoxie) {
        if (databomb instanceof Object) {
        } else {
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
        root.HTML = factory(root.d3, root.Grid, root.HipieDDL, root.Surface, root.Cell);
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
        } else {
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


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/Audio.js',["../common/HTMLWidget"], factory);
    } else {
        root.Entity = factory(root.HTMLWidget);
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
        define('other/ISlider',[], factory);
    } else {
        root.ISlider = factory();
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
        root.IWordCloud = factory();
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



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('other/MorphText.js',["../common/SVGWidget", "css!./MorphText"], factory);
    } else {
        root.Entity = factory(root.SVGWidget);
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
        define('other/PropertyEditor.js',["../common/Widget", "../common/HTMLWidget", "./Persist"], factory);
    } else {
        root.Entity = factory(root.Widget, root.HTMLWidget, root.Persist);
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
        root.Entity = factory(root.SVGWidget, root.ISlider);
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
        root.Entity = factory(root.HTMLWidget);
    }
}(this, function (HTMLWidget) {
    function Table() {
        HTMLWidget.call(this);
        this._class = "other_Table";

        this._tag = "table";

        this._columns = [];
    };
    Table.prototype = Object.create(HTMLWidget.prototype);

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
        root.Entity = factory(root.SVGWidget, root.IWordCloud, root.d3);
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
        require(["lib/wordcloud/d3.layout.cloud"], function (d3LayoutClout) {
            SVGWidget.prototype.render.call(context, callback);
        });
        return this;
    };

    return WordCloud;
}));


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('tree/ITree.js',["../common/Palette"], factory);
    } else {
        root.ITree = factory(root.Palette);
    }
}(this, function (Palette) {
    function ITree() {
    };

    ITree.prototype._palette = Palette.ordinal("default");

    //  Data ---
    ITree.prototype.testData = function () {
        var data = {label: "root", children: [{
            label: "A",
            children: [{
                label: "AA",
                children: [{
                    label: "AAA"
                }]
            }, {
                label: "AB",
                children: [{
                    label: "ABA"
                }]
            }]
        }, {
            label: "B",
            children: [{
                label: "BA",
                children: [{
                    label: "BAA"
                }]
            }, {
                label: "BB"
            }]
        }]};
        this.data(data);
        return this;
    };

    //  Events  ---
    ITree.prototype.click = function (d) {
        console.log("Click:  " + d.label);
    };

    return ITree;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('tree/CirclePacking.js',["d3/d3", "../common/SVGWidget", "./ITree", "../common/Text", "../common/FAChar", "css!./CirclePacking"], factory);
    } else {
        root.CirclePacking = factory(root.d3, root.SVGWidget, root.ITree, root.Text, root.FAChar);
    }
}(this, function (d3, SVGWidget, ITree, Text, FAChar) {
    function CirclePacking(target) {
        SVGWidget.call(this);
        ITree.call(this);
        this._class = "tree_CirclePacking";
    };
    CirclePacking.prototype = Object.create(SVGWidget.prototype);
    CirclePacking.prototype.implements(ITree.prototype);
	
    CirclePacking.prototype.publish("paletteID", "default", "set", "Palette ID", CirclePacking.prototype._palette.switch());
	
    CirclePacking.prototype.enter = function (domNode, element) {
        var context = this;

        this.diameter = Math.min(this.width(), this.height());

        this.pack = d3.layout.pack()
            .size([this.diameter - 4, this.diameter - 4])
            .value(function (d) {
                return 1;
            })
        ;

        this.svg = element
            .append("g")
            .attr("transform", "rotate(30)")
    };

    CirclePacking.prototype.update = function (domNode, element) {
        var context = this;
		
        this._palette = this._palette.switch(this._paletteID);
        this.svg.selectAll("circle").remove();
        this.svg.selectAll("text").remove();

        var root = this._data;
        var focus = root;
        var nodes = this.pack.nodes(root);

        this.circle = this.svg.selectAll("circle")
            .data(nodes)
          .enter().append("circle")
            .attr("class", function (d) { return d.parent ? d.children ? "node" : "node leaf" : "node root"; })
            .style("fill", function (d) { return context._palette(d.label); })
            .on("click", function (d) { context.click(d); })
            .on("dblclick", function (d) { if (focus !== d) context.zoom(d), d3.event.stopPropagation(); })
        ;
        this.circle.append("title").text(function (d) { return d.label; });

        var text = this.svg.selectAll("text")
            .data(nodes)
          .enter()
            .append("text")
            .attr("class", "label")
            .style("fill-opacity", function (d) { return d.parent === root ? 1 : 0; })
            .style("display", function (d) { return d.parent === root ? null : "none"; })
            .text(function (d) { return d.label; })
        ;

        this.node = this.svg.selectAll("circle,text");

        this.zoomTo([root.x, root.y, root.r * 2]);
    };

    CirclePacking.prototype.zoom = function (d) {
        var context = this;
        var focus0 = focus;
        var focus = d;

        var zoomCircleSel = this.svg.selectAll("circle")
          .filter(function (d) { return d === focus; })
        ;
        var zoomTextSel = this.svg.selectAll("text")
          .filter(function (d) { return d !== focus && this.style.display === "inline"; })
        ;
        zoomTextSel.transition().duration(500)
            .style("opacity", 0)
            .each("end", function (d) {
                if (d !== focus) {
                    d3.select(this)
                        .style("display", "none")
                        .style("opacity", 1)
                    ;
                }
            })
        ;

        var transition = this.svg.transition()
            .duration(1000)
            .tween("zoom", function (d) {
                var i = d3.interpolateZoom(context.view, [focus.x, focus.y, focus.r * 2]);
                return function (t) { context.zoomTo(i(t)); };
            });

        transition.selectAll("text")
          .filter(function (d) { return d.parent === focus || this.style.display === "inline"; })
            .style("fill-opacity", function (d) { return d.parent === focus ? 1 : 0; })
            .each("start", function (d) { if (d.parent === focus) this.style.display = "inline"; })
            .each("end", function (d) {
                if (d.parent !== focus) {
                    this.style.display = "none";
                }
            })
        ;
    };

    CirclePacking.prototype.zoomTo = function (v) {
        var k = this.diameter / v[2];
        this.view = v;
        this.node.attr("transform", function (d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")rotate(-30)"; });
        this.circle.attr("r", function (d) { return d.r * k; });
    };

    return CirclePacking;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('tree/Dendrogram.js',["d3/d3", "../common/SVGWidget", "./ITree", "css!./Dendrogram"], factory);
    } else {
        root.Dendrogram = factory(root.d3, root.SVGWidget, root.ITree);
    }
}(this, function (d3, SVGWidget, ITree) {
    function Dendrogram(target) {
        SVGWidget.call(this);
        ITree.call(this);
        this._class = "tree_Dendrogram";
    };
    Dendrogram.prototype = Object.create(SVGWidget.prototype);
    Dendrogram.prototype.implements(ITree.prototype);
	
    Dendrogram.prototype.publish("paletteID", "default", "set", "Palette ID", Dendrogram.prototype._palette.switch());
	
    Dendrogram.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);

        this.layout = d3.layout.cluster();

        this.diagonal = d3.svg.diagonal()
            .projection(function (d) { return [d.y, d.x]; })
        ;

        this.g = element.append("g");
    };

    Dendrogram.prototype.update = function (domNode, element) {
        var context = this;
        SVGWidget.prototype.update.apply(this, arguments);
		
        this._palette = this._palette.switch(this._paletteID);
        var width = this.width() - 60;  //  Pad to allow text to display
        this.layout
            .size([this.height(), width])
        ;
        this.g
            .attr("transform", "translate(" + (-width  / 2) + "," + (-this.height() / 2) + ")");
        ;

        var nodes = this.layout.nodes(this.data());
        var links = this.layout.links(nodes);

        //  Lines  ---
        var lines = this.g.selectAll(".link").data(links);
        lines.enter().append("path")
            .attr("class", "link")
        ;
        lines
            .attr("d", this.diagonal)
        ;
        lines.exit().remove();

        //  Nodes  ---
        var nodes = this.g.selectAll(".node").data(nodes);
        var node_enter = nodes.enter().append("g")
            .attr("class", "node")
        ;

        node_enter.on("click", function (d) { context.click(d); });
        node_enter.append("circle");
        node_enter.append("text");
        
        nodes.select("circle")
            .attr("r", 4.5)
            .style("fill", function (d) { return context._palette(d.label); })
            .append("title")
            .text(function (d) { return d.label; })
        ;
        nodes.select("text")
            .attr("dx", function (d) { return d.children ? -8 : 8; })
            .attr("dy", 3)
        ;
        nodes
            .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; })
        ;
        nodes.select("text")
            .style("text-anchor", function (d) { return d.children ? "end" : "start"; })
            .text(function (d) { return d.label; })
        ;
        nodes.exit().remove();
    };

    return Dendrogram;
}));



(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('tree/SunburstPartition.js',["d3/d3", "../common/SVGWidget", "./ITree", "../common/Text", "../common/FAChar", "css!./SunburstPartition"], factory);
    } else {
        root.SunburstPartition = factory(root.d3, root.SVGWidget, root.ITree, root.Text, root.FAChar);
    }
}(this, function (d3, SVGWidget, ITree, Text, FAChar) {
    function SunburstPartition(target) {
        SVGWidget.call(this);
        ITree.call(this);
        this._class = "tree_SunburstPartition";
    };
    SunburstPartition.prototype = Object.create(SVGWidget.prototype);
    SunburstPartition.prototype.implements(ITree.prototype);
	
    SunburstPartition.prototype.publish("paletteID", "default", "set", "Palette ID", SunburstPartition.prototype._palette.switch());

    SunburstPartition.prototype.root = function (_) {
        if (!arguments.length) return this._root || this._data;
        this._root = _;

        if (this.svg) {
            this.svg.selectAll("path").transition()
                .duration(750)
                .attrTween("d", this.arcTweenFunc(this._root))
            ;
        }
        return this;
    };

    SunburstPartition.prototype.data = function () {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            this._resetRoot = true;
        }
        return this;
    };

    SunburstPartition.prototype.enter = function (domNode, element) {
        var context = this;

        this.radius = Math.min(this.width(), this.height()) / 2;

        this._xScale = d3.scale.linear()
            .range([0, 2 * Math.PI])
        ;

        this._yScale = d3.scale.sqrt()
            .range([0, this.radius])
        ;

        this.partition = d3.layout.partition()
            .value(function (d) {
                return d.value !== undefined ? d.value : 1;
            })
        ;

        this.arc = d3.svg.arc()
            .startAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, context._xScale(d.x))); })
            .endAngle(function (d) { return Math.max(0, Math.min(2 * Math.PI, context._xScale(d.x + d.dx))); })
            .innerRadius(function (d) { return Math.max(0, context._yScale(d.y)); })
            .outerRadius(function (d) { return Math.max(0, context._yScale(d.y + d.dy)); })
        ;

        this.svg = element.append("g");
    };

    SunburstPartition.prototype.update = function (domNode, element) {
        var context = this;

        this._palette = this._palette.switch(this._paletteID);
        this.radius = Math.min(this.width(), this.height()) / 2;
        this._xScale.range([0, 2 * Math.PI]);
        this._yScale.range([0, this.radius]);

        this._dataNodes = this.partition.nodes(this._data);
        var paths = this.svg.selectAll("path").data(this._dataNodes, function (d, i) { return d.id !== undefined ? d.id : i; });
        var path = paths.enter().append("path")
            .on("click", function (d) { context.click(d); })
            .on("dblclick", dblclick)
            .append("title")
        ;
        paths
            .attr("d", this.arc)
            .style("fill", function (d) { 
                return d.__viz_fill ? d.__viz_fill : context._palette(d.label); 
            })
            .style("stroke", function (d) { 
                return d.value > 16 ? "white" : "none"; 
            })
            .select("title")
                .text(function (d) { return d.label })
        ;

        paths.exit().remove();

        if (this._resetRoot) {
            this._resetRoot = false;
            this.root(this._dataNodes[0]);
        }

        function dblclick(d) {
            if (d3.event) {
                d3.event.stopPropagation();
            }
            context.root(d);
        }
    };

    SunburstPartition.prototype.arcTweenFunc = function (d) {
        var xd = d3.interpolate(this._xScale.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(this._yScale.domain(), [d.y, 1]),
            yr = d3.interpolate(this._yScale.range(), [d.y ? 20 : 0, this.radius]);
        var context = this;
        return function (d, i) {
            return i
                ? function (t) { return context.arc(d); }
                : function (t) { context._xScale.domain(xd(t)); context._yScale.domain(yd(t)).range(yr(t)); return context.arc(d); };
        };
    };

    return SunburstPartition;
}));

