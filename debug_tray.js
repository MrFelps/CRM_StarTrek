const { exec } = require('child_process');
const fs = require('fs');

const cmd = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "c:\\Users\\Adm\\Desktop\\repositorio\\CRM_inteligente\\tray_crm.ps1"';

console.log('Spawning command...');
const p = exec(cmd, (err, stdout, stderr) => {
    console.log('Process finished.');
    console.log('Exit code:', p.exitCode);
    console.log('Stdout:', stdout);
    console.log('Stderr:', stderr);
});

setTimeout(() => {
    console.log('Process still running after 3 seconds? Pid:', p.pid, 'Killed:', p.killed);
    if (!p.killed && p.exitCode === null) {
        console.log('YES! It is alive and running.');
    }
}, 3000);
