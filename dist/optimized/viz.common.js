
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Widget.js',["d3/d3", "require"], factory);
    } else {
        root.common_Widget = factory(root.d3);
    }
}(this, function (d3, require) {
    var root = this;
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
    Widget.prototype.require = window.require || function (paths, cb) {
        if (typeof paths === 'function') {
            cb = paths
            paths = []
        }

        var objs = paths.map(function (path) {
            var prop = path.substring("../".length).split("/").join("_")
            return root[prop]
        })
        
        cb.apply(null, objs)
    }
    if (!window.require) {
        window.require = Widget.prototype.require;
    }

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
        root.common_Transition = factory();
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
        define('common/SVGWidget.js',["./Widget", "./Transition", "d3/d3"], factory);
    } else {
        root.common_SVGWidget = factory(root.common_Widget, root.common_Transition, root.d3);
    }
}(this, function (Widget, Transition, d3) {
    function SVGWidget() {
        Widget.call(this);

        this._tag = "g";

        this._boundingBox = null;

        this.transition = new Transition(this);

        this._drawStartPos = "center"; 
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
        switch (this._drawStartPos) {
            case "origin":
                this.pos({
                    x: 0,
                    y: 0
                });
                break;
            case "center":
            default:
                this.pos({
                    x: this._size.width / 2,
                    y: this._size.height / 2
                });
                break;
        }
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

if (typeof define === "function" && define.amd) {
  define('css',[], function () { 
    return {
      load: function ($1, $2, load) { load() }
    } 
  })
};


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/Text.js',["./SVGWidget", "css!./Text"], factory);
    } else {
        root.common_Text = factory(root.common_SVGWidget);
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
        define('common/FAChar',["./SVGWidget", "./Text", "css!font-awesome/css/font-awesome", "css!./FAChar"], factory);
    } else {
        root.common_FAChar = factory(root.common_SVGWidget, root.common_Text);
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
        define('common/HTMLWidget.js',["./Widget", "./Transition", "d3/d3"], factory);
    } else {
        root.common_HTMLWidget = factory(root.common_Widget, root.common_Transition, root.d3);
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


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('common/IList',[], factory);
    } else {
        root.common_IList = factory();
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
        root.common_IMenu = factory();
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
        root.common_Shape = factory(root.common_SVGWidget);
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
        root.common_Icon = factory(root.common_SVGWidget, root.common_Shape, root.common_FAChar);
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
        root.common_TextBox = factory(root.common_SVGWidget, root.common_Shape, root.common_Text);
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
        root.common_List = factory(root.d3, root.common_SVGWidget, root.common_IList, root.common_TextBox);
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
        root.common_Menu = factory(root.common_SVGWidget, root.common_IMenu, root.common_Icon, root.common_List);
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
        define('common/Palette.js',["d3/d3", "colorbrewer/colorbrewer"], factory);
    } else {
        root.common_Palette = factory(root.d3);
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
        define('common/Surface.js',["./SVGWidget", "./Icon", "./Shape", "./Text", "./FAChar", "./Menu", "css!./Surface"], factory);
    } else {
        root.common_Surface = factory(root.common_SVGWidget, root.common_Icon, root.common_Shape, root.common_Text, root.common_FAChar, root.common_Menu);
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
        define('common/ResizeSurface.js',["./Surface", "css!./ResizeSurface"], factory);
    } else {
        root.common_ResizeSurface = factory(root.common_Surface);
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

