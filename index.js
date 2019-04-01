#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

console.time('collecting react router files');

// get script command params
const params = process.argv.reverse();

const root = path.resolve(__dirname, '../../');

const config = require(path.resolve(root, params[0]));

if (typeof config !== 'object') throw new Error('need a config file');

// 路由文件名
const targetFilename = config.targetFilename;
// 入口组件名
const entryModuleName = config.entryModuleName;
// 包含模块，即最终打包的模块
const include = config.include;
// 寻找路由的目录
const targetDirectory = path.resolve(root, config.targetDirectory);
// 入口组件
const entryModulePath = path.resolve(root, config.entryModulePath);
// 所要生产的router.js路径
const rootRouterPath = path.resolve(root, config.rootRouterPath);

// recursion search router file
const searchFile = (filePath, targetFilename, result = []) => {
  fs.readdirSync(filePath).forEach(filename => {
    if (filename === targetFilename) {
      return result.push(`${filePath}/${filename}`);
    }
    const fileDir = `${filePath}/${filename}`;
    if (fs.statSync(fileDir).isDirectory()) return searchFile(fileDir, targetFilename, result);
  });
  return result;
};

// 获取相对路径
const getRelativePath = (thePath = '') => {
  return path.relative(path.dirname(rootRouterPath), path.dirname(thePath));
};
// 将路径组合成驼峰式router名
const getRouterNamePrefix = thePath => thePath.split('/').map(item => item.replace(/^[^\w_]$/g, '').replace(/^(\w)/, (a, b) => b.toUpperCase())).join('');

// 补全相对路径缺少的'./'
const repairDirnameForImport = thePath => thePath ? `./${thePath}/` : './';

const filePathArray = searchFile(targetDirectory, targetFilename);

// import语句
let moduleImportSentenceString = '';

// router语句
const moduleInfo = (thePath, fileName) => {
  thePath = repairDirnameForImport(thePath);
  const name = `${getRouterNamePrefix(thePath)}Router`;
  return {
    header: `import ${name} from '${thePath}${fileName.replace(/\.js$/, '')}';\n`,
    name,
  };
};
// router.js模板
let template = fs.readFileSync(path.resolve(__dirname, './router-template.js')).toString();

// 拼接router.js文件
const generateRouter = (pathArray) => {
  const App = moduleInfo(getRelativePath(entryModulePath), entryModuleName);
  moduleImportSentenceString += App.header;
  template = template.replace(/'@@_@@0'/, App.name);
  let routeString = '';
  if (pathArray && Array.isArray(pathArray)) {
    pathArray.forEach((item) => {
      if (include && !include.test(item)) return;
      const thePath = getRelativePath(item);
      const aModule = moduleInfo(thePath, targetFilename);
      moduleImportSentenceString += aModule.header;
      // 将文件路径名拼接到现有route的path上
      routeString += `...addFolderNameForRoute(${aModule.name}, '/${thePath}'), `;
    });
  }
  routeString = routeString.replace(/, $/, '');
  template = moduleImportSentenceString + template.replace(/'@@_@@1'/, routeString);
  fs.writeFileSync(rootRouterPath, template);
};

generateRouter(filePathArray);

console.log('\n');
console.timeEnd('collecting react router files');
console.log('\n');
