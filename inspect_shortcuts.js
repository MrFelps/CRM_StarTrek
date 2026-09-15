const fs = require('fs');
const path = require('path');
const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');

console.log('Desktop files:');
fs.readdirSync(desktopPath).forEach(file => {
    if (file.toLowerCase().includes('crm')) {
        console.log(' - ' + file);
    }
});
