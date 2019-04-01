
const addFolderNameForRoute = (routes = [], folderPathName = '') => routes.map(route => Object.assign(route, { path: folderPathName + route.path }));

const routes = [{
  component: '@@_@@0',
  routes: ['@@_@@1'],
}];

export default routes;
