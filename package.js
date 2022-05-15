const packager = require('electron-packager');
const { execSync } = require('child_process');
const fs = require('fs');
const pjson = require('./package.json');

const packageOptions = {
  dir: '.',
  appVersion: pjson.version,
  name: 'monolith-code',
  executableName: 'monolith-code',
  icon: './res/img/icon',
  ignore: ['docs', 'updater', '.github', '.eslintrc.js', '.gitignore', '.gitattributes', 'package.js$'],
  overwrite: true,
  quiet: true,
  win32metadata: {
    CompanyName: 'Haeri Studios',
    OriginalFilename: 'monolith-code',
    ProductName: 'monolith code',
    InternalName: pjson.name,
  },
};

async function main() {
  console.log('------ STARTING PACKAGING ------');

  process.stdout.write('1. Packaging main executable...');
  let dir = await packager(packageOptions);
  dir = dir[0];
  /*
  console.log(`Electron app bundles created:\n${dir}`)
  fs.readdirSync(dir).forEach(file => {
    err = false;
    try{
      fs.accessSync(file, fs.constants.X_OK);
    }
    catch(e){
      err = true;
    }
    console.log(`${file} ${err ? '' : '\tx'}`);    
  });
  */
  process.stdout.write('\t\tOK\n');



  if (process.platform === 'linux') {
    process.stdout.write('1.1. chmod-ing executable...');
    execSync(`chmod +x '${packageOptions.executableName}'`, {
      cwd: dir,
    });
    process.stdout.write('\t\tOK\n');
  }

  process.stdout.write('2. Installing NPM for updater...');
  execSync('npm install', {
    cwd: './updater',
  });
  process.stdout.write('\tOK\n');

  console.log('------ FINISHED PACKAGING ------');
}

main();
