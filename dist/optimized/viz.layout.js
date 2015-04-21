if (typeof define === "function" && define.amd) {
  define('css',[], function () { 
    return {
      load: function ($1, $2, load) { load() }
    } 
  })
};


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('layout/Surface.js',["../common/HTMLWidget", "../chart/MultiChart", "../c3/Column", "../c3/Line", "css!./Surface"], factory);
    } else {
        root.layout_Surface = factory(root.common_HTMLWidget, root.chart_MultiChart, root.c3_Column, root.c3_Line);
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
        root.layout_Cell = factory(root.layout_Surface, root.chart_Pie, root.c3_Column, root.c3_Line);
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
        define('layout/Grid.js',["../common/HTMLWidget", "./Cell", "../common/Text", "../chart/Pie", "../chart/MultiChart", "../c3/Column", "../c3/Line", "css!./Grid"], factory);
    } else {
        root.layout_Grid = factory(root.common_HTMLWidget, root.layout_Cell, root.common_Text, root.chart_Pie, root.chart_MultiChart, root.c3_Column, root.c3_Line);
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

