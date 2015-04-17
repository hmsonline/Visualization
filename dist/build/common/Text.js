(function(e,t){typeof define=="function"&&define.amd?define(["./SVGWidget","css!./Text"],t):e.Text=t(e.SVGWidget)})(this,function(e){function t(){e.call(this),this._class="common_Text"}return t.prototype=Object.create(e.prototype),t.prototype.publish("text","","string","Display Text"),t.prototype.publish("font_family","","string","Font Family"),t.prototype.publish("font_size",null,"number","Font Size (px)"),t.prototype.publish("anchor","middle","set","Anchor Position",["start","middle","end"]),t.prototype.publish("color_fill",null,"html-color","Fill Color"),t.prototype.testData=function(){return this.text("Hello\nand\nWelcome!"),this},t.prototype.enter=function(t,n){e.prototype.enter.apply(this,arguments),this._textElement=n.append("text")},t.prototype.update=function(t,n){e.prototype.update.apply(this,arguments),this._textElement.attr("font-family",this.__meta_font_family.defaultValue!==this._font_family?this._font_family:null).attr("font-size",this.__meta_font_size.defaultValue!==this._font_size?this._font_size:null);var r=this._text.split("\n"),i=this._textElement.selectAll("tspan").data(r,function(e){return e});i.enter().append("tspan").attr("class",function(e,t){return"tspan_"+t}).attr("dy","1em").attr("x","0"),i.style("fill",this.__meta_color_fill.defaultValue!==this._color_fill?this._color_fill:null).text(function(e){return e}),i.exit().remove();var s={width:0,height:0};try{s=this._textElement.node().getBBox()}catch(o){}var u=0;switch(this._anchor){case"start":u=-s.width/2;break;case"end":u=s.width/2}var a=-(s.y+s.height/2);this._textElement.style("text-anchor",this._anchor).attr("transform",function(e){return"translate("+u+","+a+")"})},t});