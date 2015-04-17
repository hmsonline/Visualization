(function(e,t){typeof define=="function"&&define.amd?define(["d3/d3","../common/SVGWidget","./ITree","../common/Text","../common/FAChar","css!./CirclePacking"],t):e.Tree_CirclePacking=t(e.d3,e.SVGWidget,e.Tree_ITree,e.Text,e.FAChar)})(this,function(e,t,n,r,i){function s(e){t.call(this),n.call(this),this._class="tree_CirclePacking"}return s.prototype=Object.create(t.prototype),s.prototype.implements(n.prototype),s.prototype.publish("paletteID","default","set","Palette ID",s.prototype._palette.switch()),s.prototype.enter=function(t,n){var r=this;this.diameter=Math.min(this.width(),this.height()),this.pack=e.layout.pack().size([this.diameter-4,this.diameter-4]).value(function(e){return 1}),this.svg=n.append("g").attr("transform","rotate(30)")},s.prototype.update=function(t,n){var r=this;this._palette=this._palette.switch(this._paletteID),this.svg.selectAll("circle").remove(),this.svg.selectAll("text").remove();var i=this._data,s=i,o=this.pack.nodes(i);this.circle=this.svg.selectAll("circle").data(o).enter().append("circle").attr("class",function(e){return e.parent?e.children?"node":"node leaf":"node root"}).style("fill",function(e){return r._palette(e.label)}).on("click",function(e){r.click(e)}).on("dblclick",function(t){s!==t&&(r.zoom(t),e.event.stopPropagation())}),this.circle.append("title").text(function(e){return e.label});var u=this.svg.selectAll("text").data(o).enter().append("text").attr("class","label").style("fill-opacity",function(e){return e.parent===i?1:0}).style("display",function(e){return e.parent===i?null:"none"}).text(function(e){return e.label});this.node=this.svg.selectAll("circle,text"),this.zoomTo([i.x,i.y,i.r*2])},s.prototype.zoom=function(t){var n=this,r=i,i=t,s=this.svg.selectAll("circle").filter(function(e){return e===i}),o=this.svg.selectAll("text").filter(function(e){return e!==i&&this.style.display==="inline"});o.transition().duration(500).style("opacity",0).each("end",function(t){t!==i&&e.select(this).style("display","none").style("opacity",1)});var u=this.svg.transition().duration(1e3).tween("zoom",function(t){var r=e.interpolateZoom(n.view,[i.x,i.y,i.r*2]);return function(e){n.zoomTo(r(e))}});u.selectAll("text").filter(function(e){return e.parent===i||this.style.display==="inline"}).style("fill-opacity",function(e){return e.parent===i?1:0}).each("start",function(e){e.parent===i&&(this.style.display="inline")}).each("end",function(e){e.parent!==i&&(this.style.display="none")})},s.prototype.zoomTo=function(e){var t=this.diameter/e[2];this.view=e,this.node.attr("transform",function(n){return"translate("+(n.x-e[0])*t+","+(n.y-e[1])*t+")rotate(-30)"}),this.circle.attr("r",function(e){return e.r*t})},s});