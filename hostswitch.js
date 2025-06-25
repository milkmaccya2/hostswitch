#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { program } = require('commander');
const chalk = require('chalk');
const { execSync } = require('child_process');

class HostSwitch {
  constructor() {
    this.configDir = path.join(os.homedir(), '.hostswitch');
    this.profilesDir = path.join(this.configDir, 'profiles');
    this.backupDir = path.join(this.configDir, 'backups');
    this.hostsPath = '/etc/hosts';
    this.currentProfileFile = path.join(this.configDir, 'current.json');
    
    this.ensureDirs();
  }

  ensureDirs() {
    fs.ensureDirSync(this.configDir);
    fs.ensureDirSync(this.profilesDir);
    fs.ensureDirSync(this.backupDir);
  }

  getCurrentProfile() {
    try {
      if (fs.existsSync(this.currentProfileFile)) {
        const data = fs.readJsonSync(this.currentProfileFile);
        return data.profile || null;
      }
    } catch (err) {
      console.error(chalk.red('Error reading current profile'));
    }
    return null;
  }

  setCurrentProfile(profileName) {
    fs.writeJsonSync(this.currentProfileFile, { profile: profileName });
  }

  backupHosts() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `hosts_${timestamp}`);
    try {
      fs.copySync(this.hostsPath, backupPath);
      return backupPath;
    } catch (err) {
      console.error(chalk.yellow('Warning: Could not backup hosts file'));
      return null;
    }
  }

  listProfiles() {
    const profiles = fs.readdirSync(this.profilesDir)
      .filter(file => file.endsWith('.hosts'))
      .map(file => file.replace('.hosts', ''));
    
    if (profiles.length === 0) {
      console.log(chalk.yellow('No profiles found.'));
      return;
    }

    const current = this.getCurrentProfile();
    console.log(chalk.bold('Available profiles:'));
    
    profiles.forEach(profile => {
      const marker = profile === current ? chalk.green(' [current]') : '';
      console.log(`  - ${profile}${marker}`);
    });
  }

  createProfile(name, fromCurrent = false) {
    const profilePath = path.join(this.profilesDir, `${name}.hosts`);
    
    if (fs.existsSync(profilePath)) {
      console.error(chalk.red(`Error: Profile '${name}' already exists.`));
      return false;
    }

    try {
      if (fromCurrent) {
        fs.copySync(this.hostsPath, profilePath);
        console.log(chalk.green(`Profile '${name}' created from current hosts file.`));
      } else {
        const defaultContent = `# Host Database
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost
`;
        fs.writeFileSync(profilePath, defaultContent);
        console.log(chalk.green(`Profile '${name}' created with default content.`));
      }
      return true;
    } catch (err) {
      console.error(chalk.red(`Error creating profile: ${err.message}`));
      return false;
    }
  }

  switchProfile(name) {
    const profilePath = path.join(this.profilesDir, `${name}.hosts`);
    
    if (!fs.existsSync(profilePath)) {
      console.error(chalk.red(`Error: Profile '${name}' does not exist.`));
      return false;
    }

    const backupPath = this.backupHosts();
    if (backupPath) {
      console.log(chalk.dim(`Current hosts backed up to: ${backupPath}`));
    }

    try {
      fs.copySync(profilePath, this.hostsPath);
      this.setCurrentProfile(name);
      console.log(chalk.green(`Switched to profile '${name}'.`));
      return true;
    } catch (err) {
      if (err.code === 'EACCES') {
        console.error(chalk.red('Error: Permission denied. Run with sudo.'));
      } else {
        console.error(chalk.red(`Error switching profile: ${err.message}`));
      }
      return false;
    }
  }

  deleteProfile(name) {
    const profilePath = path.join(this.profilesDir, `${name}.hosts`);
    
    if (!fs.existsSync(profilePath)) {
      console.error(chalk.red(`Error: Profile '${name}' does not exist.`));
      return false;
    }

    const current = this.getCurrentProfile();
    if (current === name) {
      console.error(chalk.red(`Error: Cannot delete the currently active profile '${name}'.`));
      return false;
    }

    try {
      fs.unlinkSync(profilePath);
      console.log(chalk.green(`Profile '${name}' deleted.`));
      return true;
    } catch (err) {
      console.error(chalk.red(`Error deleting profile: ${err.message}`));
      return false;
    }
  }

  showProfile(name) {
    const profilePath = path.join(this.profilesDir, `${name}.hosts`);
    
    if (!fs.existsSync(profilePath)) {
      console.error(chalk.red(`Error: Profile '${name}' does not exist.`));
      return false;
    }

    console.log(chalk.bold(`Content of profile '${name}':`));
    console.log(chalk.dim('-'.repeat(40)));
    const content = fs.readFileSync(profilePath, 'utf8');
    console.log(content);
    console.log(chalk.dim('-'.repeat(40)));
    return true;
  }

  editProfile(name) {
    const profilePath = path.join(this.profilesDir, `${name}.hosts`);
    
    if (!fs.existsSync(profilePath)) {
      console.error(chalk.red(`Error: Profile '${name}' does not exist.`));
      return false;
    }

    const editor = process.env.EDITOR || 'vi';
    try {
      execSync(`${editor} ${profilePath}`, { stdio: 'inherit' });
      return true;
    } catch (err) {
      console.error(chalk.red(`Error opening editor: ${err.message}`));
      return false;
    }
  }
}

const hs = new HostSwitch();

program
  .name('hostswitch')
  .description('Simple hosts file switcher')
  .version('1.0.0');

program
  .command('list')
  .alias('ls')
  .description('List all profiles')
  .action(() => {
    hs.listProfiles();
  });

program
  .command('create <name>')
  .description('Create a new profile')
  .option('-c, --from-current', 'Create from current hosts file')
  .action((name, options) => {
    hs.createProfile(name, options.fromCurrent);
  });

program
  .command('switch <name>')
  .alias('use')
  .description('Switch to a profile (requires sudo)')
  .action((name) => {
    hs.switchProfile(name);
  });

program
  .command('delete <name>')
  .alias('rm')
  .description('Delete a profile')
  .action((name) => {
    hs.deleteProfile(name);
  });

program
  .command('show <name>')
  .alias('cat')
  .description('Show profile content')
  .action((name) => {
    hs.showProfile(name);
  });

program
  .command('edit <name>')
  .description('Edit a profile')
  .action((name) => {
    hs.editProfile(name);
  });

program.parse(process.argv);