// Test fixtures for hosts files

const fixtures = {
  defaultHosts: `# Host Database
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost
`,

  developmentHosts: `# Host Database
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost

# Development servers
127.0.0.1       api.myapp.local
127.0.0.1       app.myapp.local
127.0.0.1       db.myapp.local
`,

  productionHosts: `# Host Database
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
127.0.0.1       localhost
255.255.255.255 broadcasthost
::1             localhost

# Production servers
192.168.1.100   api.myapp.com
192.168.1.101   app.myapp.com
192.168.1.102   db.myapp.com
`,

  invalidHosts: `This is not a valid hosts file format!
Random text here
No proper formatting
`
};

module.exports = fixtures;