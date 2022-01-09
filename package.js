const packager = require('electron-packager');
const { execSync } = require('child_process');
const fs = require('fs');
const pjson = require('./package.json');

const packageOptions = {
  dir: '.',
  appVersion: pjson.version,
  name: 'monolith_code',
  executableName: 'monolith code',
  icon: './res/img/icon',
  ignore: ['docs', 'updater', '.github', '.eslintrc.js', '.gitignore', '.gitattributes', 'package.js$'],
  overwrite: true,
  quiet: true,
  win32metadata: {
    CompanyName: 'Haeri Studios',
    OriginalFilename: 'monolith code',
    ProductName: 'monolith code',
    InternalName: pjson.name,
  },
};

async function main() {
  console.log('------ STARTING PACKAGING ------');

  process.stdout.write('1. Packaging main executable...');
  const dir = await packager(packageOptions);
  console.log(`Electron app bundles created:\n${dir.join("\n")}`)

  console.log("Dumping contents:");
  fs.readdirSync(dir[0]).forEach(file => {
    console.log(file);
  });
  

  process.stdout.write('\t\tOK\n');

  if (process.platform === 'linux' || process.platform === 'darwin') {
    process.stdout.write('1.1. chmod-ing executable...');
    execSync(`chmod +x '${packageOptions.executableName}'`, {
      cwd: dir[0],
    });
    process.stdout.write('\t\tOK\n');
  }

  process.stdout.write('2. Installing NPM for updater...');
  execSync('npm install', {
    cwd: './updater',
  });
  process.stdout.write('\tOK\n');

  process.stdout.write('3. Packaging updater...');
  execSync('npm run package', {
    cwd: './updater',
  });
  process.stdout.write('\t\t\tOK\n');

  if (process.platform === 'linux' || process.platform === 'darwin') {
    process.stdout.write('3.1. chmod-ing updater...');
    execSync(`chmod +x updater`, {
      cwd: './updater',
    });
    process.stdout.write('\t\tOK\n');
  }

  process.stdout.write('4. Copying updater...');
  const updater = fs.readdirSync('./updater/').filter((fn) => fn.startsWith('updater'));
  fs.mkdirSync(`${dir}/${pjson.version}`);
  fs.copyFileSync(`./updater/${updater[0]}`, `${dir}/${pjson.version}/${updater[0]}`);
  process.stdout.write('\t\t\tOK\n');

  console.log('------ FINISHED PACKAGING ------');
}

main();
