(function(e,t){typeof define=="function"&&define.amd?define(["../common/Palette"],t):e.Tree_ITree=t(e.Palette)})(this,function(e){function t(){}return t.prototype._palette=e.ordinal("default"),t.prototype.testData=function(){var e={label:"root",children:[{label:"A",children:[{label:"AA",children:[{label:"AAA"}]},{label:"AB",children:[{label:"ABA"}]}]},{label:"B",children:[{label:"BA",children:[{label:"BAA"}]},{label:"BB"}]}]};return this.data(e),this},t.prototype.click=function(e){console.log("Click:  "+e.label)},t});