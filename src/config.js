requirejs.config({
  baseUrl: '.',
  paths: {
    'async': '../lib/requirejs/plugins/async',
    'css': '../lib/requirejs/plugins/css',
    'text': '../lib/requirejs/plugins/text',
    'goog': '../lib/requirejs/plugins/goog',
    'propertyParser': '../lib/requirejs/plugins/propertyParser'
  },
  packages: [
    {
      name: 'c3',
      location: 'c3'
    }
  ]
});
