const { execSync } = require('child_process');

try {
    const stdout = execSync('C:\\Windows\\System32\\wbem\\WMIC.exe process where "name=\'powershell.exe\'" get CommandLine,ProcessId /format:csv', { encoding: 'utf-8' });
    console.log(stdout);
} catch (e) {
    console.error('Error:', e.message);
}
