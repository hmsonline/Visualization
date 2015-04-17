(function(e,t){typeof define=="function"&&define.amd?define(["d3/d3","../common/SVGWidget","../common/Icon","../common/TextBox","css!./Vertex"],t):e.Graph_Vertex=t(e.d3,e.SVGWidget,e.Icon,e.TextBox)})(this,function(e,t,n,r){function i(){t.call(this),this._class="graph_Vertex",this._icon=new n,this._textBox=new r,this._annotationWidgets={}}return i.prototype=Object.create(t.prototype),i.prototype.publishProxy("faChar","_icon"),i.prototype.publishProxy("icon_shape_color_fill","_icon","shape_color_fill"),i.prototype.publishProxy("icon_shape_color_stroke","_icon","shape_color_stroke"),i.prototype.publishProxy("icon_image_color_fill","_icon","image_color_fill"),i.prototype.publishProxy("text","_textBox"),i.prototype.publishProxy("anchor","_textBox"),i.prototype.publishProxy("textbox_shape_color_stroke","_textBox","shape_color_stroke"),i.prototype.publishProxy("textbox_shape_color_fill","_textBox","shape_color_fill"),i.prototype.publishProxy("textbox_text_color_fill","_textBox","text_color_fill"),i.prototype.publish("annotation_diameter",14,"number","Annotation Diameter"),i.prototype.publish("annotation_spacing",3,"number","Annotation Spacing"),i.prototype.publish("annotation_icons",[],"array","Annotations"),i.prototype.testData=function(e){return this._icon.testData(),this._textBox.testData(),this.annotation_icons([{faChar:"",tooltip:"Test A",shape_color_fill:"white",image_color_fill:"Red"},{faChar:"",tooltip:"Test B",shape_color_fill:"green",shape_color_stroke:"green",image_color_fill:"white"},{faChar:"",tooltip:"Test C",shape_color_fill:"navy",shape_color_stroke:"navy",image_color_fill:"white"}]),this},i.prototype.enter=function(e,n){t.prototype.enter.apply(this,arguments),this._icon.target(e).render(),this._textBox.target(e).render()},i.prototype.update=function(r,i){t.prototype.update.apply(this,arguments),this._icon.render();var s=this._icon.getBBox(!0);this._textBox.render();var o=this._textBox.getBBox(!0);this._icon.move({x:-(o.width/2)+s.width/3,y:-(o.height/2)-s.height/3});var u=this,a=i.selectAll(".annotation").data(this._annotation_icons);a.enter().append("g").attr("class","annotation").each(function(e,t){u._annotationWidgets[t]=(new n).target(this).shape("square")});var f=o.width/2,l=o.height/2;a.each(function(e,t){var n=u._annotationWidgets[t],r=u.textbox_shape_color_stroke();n.diameter(u._annotation_diameter).shape_color_fill(u.textbox_shape_color_fill()).shape_color_stroke(u.textbox_shape_color_stroke());for(var i in e)n[i]&&n[i](e[i]);n.render();var s=n.getBBox(!0);n.move({x:f-s.width/4,y:l+s.height/4}),f-=s.width+u._annotation_spacing}),a.exit().each(function(t,n){var r=e.select(this);delete u._annotationWidgets[n],r.remove()})},i.prototype.intersection=function(e,t){var n=this._icon.intersection(e,t,this._pos);if(n)return n;var r=this._textBox.intersection(e,t,this._pos);return r?r:null},i});