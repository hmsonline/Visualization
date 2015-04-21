if (typeof define === "function" && define.amd) {
  define('css',[], function () { 
    return {
      load: function ($1, $2, load) { load() }
    } 
  })
};


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('c3/Common.js',["d3/d3", "c3/c3", "../common/HTMLWidget", "css!c3/c3"], factory);
    } else {
        root.c3_Common = factory(root.d3, root.c3, root.common_HTMLWidget);
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

    Common.prototype.c3_eries = function() {
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
        define('c3/CommonND.js',["./Common", "../chart/INDChart"], factory);
    } else {
        root.c3_CommonND = factory(root.c3_Common, root.chart_INDChart);
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
        root.c3_Area = factory(root.c3_CommonND);
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
        root.c3_Column = factory(root.c3_CommonND);
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
        root.c3_Bar = factory(root.c3_Column);
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
        define('c3/Common1D',["./Common", "../chart/I1DChart"], factory);
    } else {
        root.c3_Common1D = factory(root.c3_Common, root.chart_I1DChart);
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
        define('c3/Common2D',["./Common", "../chart/I2DChart"], factory);
    } else {
        root.c3_Common2D = factory(root.c3_Common, root.chart_I2DChart);
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
        root.c3_Donut = factory(root.c3_Common2D);
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
        root.c3_Gauge = factory(root.c3_Common1D);
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
        define('c3/Line.js',["./CommonND"], factory);
    } else {
        root.c3_Line = factory(root.c3_CommonND);
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
        root.c3_Pie = factory(root.c3_Common2D);
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
        root.c3_Scatter = factory(root.c3_CommonND);
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
        root.c3_Step = factory(root.c3_CommonND);
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

