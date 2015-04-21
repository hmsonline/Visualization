if (typeof define === "function" && define.amd) {
  define('goog',[], function () { 
    return {
      load: function ($1, $2, load) { load() }
    } 
  })
};


(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define('google/Common.js',["d3/d3", "../common/HTMLWidget", "goog!visualization,1,packages:[corechart]"], factory);
    } else {
        root.google_Common = factory(root.d3, root.common_HTMLWidget);
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
        root.google_CommonND = factory(root.d3, root.google_Common, root.chart_INDChart);
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
        root.google_Bar = factory(root.d3, root.google_CommonND);
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
        root.google_Column = factory(root.d3, root.google_CommonND);
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
        root.google_Common2D = factory(root.d3, root.google_Common, root.chart_I2DChart);
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
        root.google_Line = factory(root.d3, root.google_CommonND);
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
        root.google_Pie = factory(root.d3, root.google_Common2D);
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

