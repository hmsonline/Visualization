(function(e,t){typeof define=="function"&&define.amd?define(["../common/HTMLWidget","css!./Table"],t):e.Table=t(e.HTMLWidget)})(this,function(e){function t(){e.call(this),this._class="other_Table",this._tag="table",this._columns=[]}return t.prototype=Object.create(e.prototype),t.prototype.enter=function(t,n){e.prototype.enter.apply(this,arguments),this._parentElement.style("overflow","auto"),this.thead=n.append("thead").append("tr"),this.tbody=n.append("tbody")},t.prototype.update=function(t,n){e.prototype.update.apply(this,arguments);var r=this,i=this.thead.selectAll("th").data(this._columns,function(e){return e});i.enter().append("th").text(function(e){return e}),i.exit().remove();var s=this.tbody.selectAll("tr").data(this._data);s.enter().append("tr").on("click",function(e){r.click(r.rowToObj(e))}),s.exit().remove();var o=s.selectAll("td").data(function(e,t){return e});o.enter().append("td"),o.text(function(e){return e instanceof String?e.trim():e}),o.exit().remove()},t.prototype.exit=function(e,t){this.thead.remove(),this.tbody.remove()},t.prototype.click=function(e){},t});