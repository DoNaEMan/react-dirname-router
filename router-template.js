'_@@import'
const addFolderNameForRoute = (routes = [], folderPathName = '') => routes.map(route => {
  if (route.withoutPathName) { return route }
  return Object.assign(route, { path: folderPathName + route.path });
});

const routes = [{
  component: '_@@component',
  routes: ['_@@content'],
}];

export default routes;