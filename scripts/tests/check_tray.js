const { execSync } = require('child_process');

try {
    const stdout = execSync('C:\\Windows\\System32\\wbem\\WMIC.exe process where "name=\'powershell.exe\'" get CommandLine,ProcessId /format:csv', { encoding: 'utf-8' });
    const lines = stdout.split('\r\n').filter(l => l.includes('tray_crm'));
    console.log('Running tray processes found:', lines.length);
    lines.forEach(l => console.log(' -> ', l.trim()));
} catch (e) {
    console.error('Error:', e.message);
}
