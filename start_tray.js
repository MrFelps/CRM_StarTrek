const { spawn } = require('child_process');
const path = require('path');

const repoDir = 'c:\\Users\\Adm\\Desktop\\repositorio\\CRM_inteligente';
const psExe = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const scriptPath = path.join(repoDir, 'tray_crm.ps1');

const child = spawn(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    cwd: repoDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
});

child.unref();

console.log('TRAY_SPAWNED_SUCCESSFULLY, PID:', child.pid);
process.exit(0);
