import * as path from 'path';
import * as os from 'os';
import { HostSwitchConfig } from '../interfaces';

export function createConfig(): HostSwitchConfig {
  const configDir = path.join(os.homedir(), '.hostswitch');
  
  return {
    configDir,
    profilesDir: path.join(configDir, 'profiles'),
    backupDir: path.join(configDir, 'backups'),
    hostsPath: process.platform === 'win32' 
      ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
      : '/etc/hosts',
    currentProfileFile: path.join(configDir, 'current.json')
  };
}