// ローカル動作確認用の簡易静的サーバー（依存パッケージなし）。実行：node web/serve.js
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var DIST = path.join(__dirname, 'dist');
var PORT = 8080;

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

http.createServer(function (req, res) {
  var urlPath = req.url === '/' ? '/index.html' : req.url;
  var filePath = path.join(DIST, decodeURIComponent(urlPath.split('?')[0]));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('http://localhost:' + PORT + ' で公開中（web/distを配信）');
});
