const https = require('https');

const apiKey = 'sk-b73e8bd298f87967-8weuql-300f6a48';

async function testHeader(name, headers) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'ninerouter-cloud-22uw.onrender.com',
      path: '/v1/models',
      method: 'GET',
      headers
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        console.log(`Header [${name}] -> Status: ${res.statusCode}, Body: ${body.slice(0, 200)}`);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.log(`Header [${name}] -> Error: ${e.message}`);
      resolve();
    });
    req.end();
  });
}

async function run() {
  await testHeader('Bearer', { 'Authorization': `Bearer ${apiKey}` });
  await testHeader('Raw-Auth', { 'Authorization': apiKey });
  await testHeader('x-api-key', { 'x-api-key': apiKey });
  await testHeader('api-key', { 'api-key': apiKey });
  await testHeader('Authorization-api-key', { 'Authorization': `ApiKey ${apiKey}` });
}

run();
