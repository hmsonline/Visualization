/*global define:false*/
(function () {
  var css = {
    load: function (name, parentConf, onLoad) {
      onLoad(null)
    }
  };

  if (typeof define === 'function') {
    define(['module'], function () { return css; });
  }
  else {
    window.css = css;
  }
})();
