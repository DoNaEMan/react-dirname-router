#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

// get script command params
const params = process.argv.reverse();

const root = path.resolve(__dirname, '../../');

const config = require(path.resolve(root, params[0]));

if (typeof config !== 'object') throw new Error('need a config file');

const main = () => {
  config.forEach((configItem) => {
    let {
      type, // 收集文件类型
      targetFilename, // 收集的目标文件名
      entryModuleName, // 入口组件名
      include, // 包含模块，即最终打包的模块
      targetDirectory, // 寻找路由的目录
      entryModulePath, // 入口组件
      newFilePath, // 生成新文件路径
      templatePath, // 自选模板文件路径
    } = configItem;

    console.time(`collecting ${type} files...`);

    // 将路径转换成绝对路径
    [ targetDirectory, entryModulePath, newFilePath, templatePath ] = getAbsolutePath([targetDirectory, entryModulePath, newFilePath, templatePath]);

    const filePathArray = searchFile(targetDirectory, targetFilename);

    generate(filePathArray, type, targetFilename, entryModuleName, include, targetDirectory, entryModulePath, newFilePath, templatePath);

    console.timeEnd(`collecting ${type} files...`);
  });
};

// 获取绝对路径
const getAbsolutePath = (pathArray = []) => {
  return pathArray.map(item => {
    if (item) {
      return path.resolve(root, item)
    }
    return item;
  })
}

// 递归查找文件
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
const getRelativePath = (thePath = '', newFilePath) => {
  return path.relative(path.dirname(newFilePath), path.dirname(thePath));
};

// 将路径组合成驼峰名
const getRouterNamePrefix = thePath => thePath.split('/').map(item => item.replace(/^[^\w_]$/g, '').replace(/^(\w)/, (a, b) => b.toUpperCase())).join('');

// 补全相对路径缺少的'./'
const repairDirnameForImport = thePath => thePath ? `./${thePath}/` : './';

// import语句
const moduleInfo = (thePath, fileName, type) => {
  const dir = repairDirnameForImport(thePath);
  let name = `${getRouterNamePrefix(dir)}` || fileName.replace(/\.js$/, '');
  if (type !== 'router') {
    name = name.replace(/^\w/, a => a.toLowerCase())
  }
  return {
    header: `import ${name} from '${dir}${fileName.replace(/\.js$/, '')}';\n`,
    name,
  };
};
// 读取模板
const getTemplate = (type, templatePath) => {
  return fs.readFileSync(path.resolve(__dirname, templatePath || `./${type}-template.js`)).toString();
};

// 拼接文件
const generate = (filePathArray, type, targetFilename, entryModuleName, include, targetDirectory, entryModulePath, newFilePath, templatePath) => {
  // import语句
  let moduleImportSentenceString = '';
  let template = getTemplate(type, templatePath, type);

  if (type === 'router') {
    const App = moduleInfo(getRelativePath(entryModulePath, newFilePath), entryModuleName, type);
    moduleImportSentenceString += App.header;
    template = template.replace(/'_@@component'/, App.name);
  }

  // 存放合拼内容到占位符_@@content
  let contentString = '';
  filePathArray && Array.isArray(filePathArray) && filePathArray.forEach((item) => {
    if (include && !include.test(item)) return;
    const thePath = getRelativePath(item, newFilePath);
    const aModule = moduleInfo(thePath, targetFilename, type);
    moduleImportSentenceString += aModule.header;
    // 将文件路径名拼接到现有route的path上
    switch (type) {
      case 'router':
        contentString += `...addFolderNameForRoute(${aModule.name}, '/${thePath}'), `;
        break;
      case 'reducer':
        contentString += `${aModule.name}, `;
        break;
    }
  });

  contentString = contentString.replace(/, $/, '');
  template = template.replace(/'_@@import'/, moduleImportSentenceString);
  template = template.replace(/'_@@content'/, contentString);
  fs.writeFileSync(newFilePath, template);
};

main();