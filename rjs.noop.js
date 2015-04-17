(function () {
  if (typeof define === "function" && define.amd) {
    var noop = {
      load: function (name, parentConf, onLoad) {
        onLoad()
      }
    }

    define(['module'], function () { return noop })
  }
})()
