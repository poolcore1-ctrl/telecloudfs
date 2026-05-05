const os = {
  type: () => 'Browser',
  release: () => '1.0.0',
  platform: () => 'browser',
  arch: () => 'x64',
  endianness: () => 'LE',
  totalmem: () => 1024 * 1024 * 1024,
  freemem: () => 512 * 1024 * 1024,
  cpus: () => [],
  networkInterfaces: () => ({}),
  homedir: () => '/',
  tmpdir: () => '/tmp',
  hostname: () => 'localhost',
  uptime: () => 0,
  loadavg: () => [0, 0, 0],
  version: () => '1.0.0',
};

export default os;
export const type = os.type;
export const release = os.release;
export const platform = os.platform;
