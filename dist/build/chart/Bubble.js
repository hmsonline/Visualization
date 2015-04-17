(function(e,t){typeof define=="function"&&define.amd?define(["d3/d3","../common/SVGWidget","./I2DChart","../common/Text","../common/FAChar","css!./Bubble"],t):e.Chart_Bubble=t(e.d3,e.SVGWidget,e.Chart_I2DChart,e.Text,e.FAChar)})(this,function(e,t,n,r,i){function s(r){t.call(this),n.call(this),this._class="chart_Bubble",this.labelWidgets={},this.d3Pack=e.layout.pack().sort(function(e,t){return e<t?-1:e>t?1:0}).size([this.width(),this.height()]).value(function(e){return e[1]})}return s.prototype=Object.create(t.prototype),s.prototype.implements(n.prototype),s.prototype.publish("paletteID","default","set","Palette ID",s.prototype._palette.switch()),s.prototype.size=function(e){var n=t.prototype.size.apply(this,arguments);return arguments.length&&this.d3Pack.size([this.width(),this.height()]),n},s.prototype.update=function(t,n){var s=this;this._palette=this._palette.switch(this._paletteID);var o=n.selectAll(".node").data(this._data.length?this.d3Pack.nodes({children:this.cloneData()}).filter(function(e){return!e.children}):[],function(e){return e[0]});o.enter().append("g").attr("class","node").attr("opacity",0).on("click",function(e){s.click(s.rowToObj(e),s._columns[1])}).each(function(t){var n=e.select(this);n.append("circle").attr("r",function(e){return e.r}).append("title"),t.__viz_faChar?s.labelWidgets[t[0]]=(new i).char(t.__viz_faChar).target(this).render():s.labelWidgets[t[0]]=(new r).text(t[0]).target(this).render()}),o.transition().attr("opacity",1).each(function(t){var n=e.select(this),r={x:t.x-s._size.width/2,y:t.y-s._size.height/2};n.select("circle").transition().attr("transform",function(e){return"translate("+r.x+","+r.y+")"}).style("fill",function(e){return s._palette(e[0])}).attr("r",function(e){return e.r}).select("title").text(function(e){return e[0]+" ("+e[1]+")"});if(t.__viz_faChar)s.labelWidgets[t[0]].pos(r).render();else{var i=t[0],o=s.labelWidgets[t[0]].getBBox().width;t.r*2<16?i="":t.r*2<o&&(i=i[0]+"..."),s.labelWidgets[t[0]].pos(r).text(i).render()}}),o.exit().transition().style("opacity",0).remove()},s});