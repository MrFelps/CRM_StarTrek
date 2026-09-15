const https = require('https');

function get(path) {
  return new Promise(resolve => {
    https.get(`https://ninerouter-cloud-22uw.onrender.com${path}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        console.log(`[${path}] Status: ${res.statusCode} -> ${data.slice(0, 300)}`);
        resolve();
      });
    }).on('error', e => {
      console.log(`[${path}] Error: ${e.message}`);
      resolve();
    });
  });
}

async function main() {
  await get('/');
  await get('/api/status');
  await get('/version');
  await get('/docs');
}

main();
