const http = require('http');

http.get('http://localhost:20128/v1/models', res => {
  console.log('LOCAL_20128_STATUS:', res.statusCode);
}).on('error', e => {
  console.log('LOCAL_20128_ERR:', e.message);
});
