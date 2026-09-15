const http = require('http');

http.get('http://localhost:3001/api/companies', res => {
  console.log('CRM_PORT_3001_STATUS:', res.statusCode);
}).on('error', e => {
  console.log('CRM_PORT_3001_OFFLINE:', e.message);
});
