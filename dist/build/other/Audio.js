(function(e,t){typeof define=="function"&&define.amd?define(["../common/HTMLWidget"],t):e.Audio=t(e.HTMLWidget)})(this,function(e){function t(){e.call(this),this._class="other_Audio",this._tag="audio",this._source=[],this._sections={}}return t.prototype=Object.create(e.prototype),t.prototype.source=function(e){return arguments.length?(this._source=e,this):this._source},t.prototype.section=function(e,t,n,r){return arguments.length?arguments.length===1?this._sections[e]:(this._sections[e]={label:e,offset:t,beatLength:n,beatCount:r,endOffset:t+r*n},this):this._sections},t.prototype.getType=function(e){switch(e){case"mp3":return"audio/mpeg; codecs='mp3'";case"ogg":return"audio/ogg; codecs='vorbis'"}return""},t.prototype.enter=function(e,t){var n=this;t.on("play",function(e){n.onPlay(e)})},t.prototype.update=function(e,t){var n=this,r=t.selectAll("source").data(this._source,function(e){return e});r.enter().append("source").attr("src",function(e){return e})},t.prototype.createTimer=function(e,t,n){var r=this;d3.timer(function(){return r.onTick(e.label,n,e),!0},n*e.beatLength,t+e.offset)},t.prototype.onTick=function(e,t,n){},t.prototype.onPlay=function(e){var t=Date.now();for(var n in this._sections){var r=this._sections[n];for(var i=0;i<r.beatCount;++i)this.createTimer(r,t,i)}},t.prototype.play=function(e){var t=this;this._element.on("canplaythrough",function(e){t.node().play()}),this.node().load()},t});