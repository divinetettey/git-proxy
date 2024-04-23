// eslint-disable-next-line max-len
import { AuthorisedRepo } from '@finos/git-proxy-common/src/index';

/* eslint-disable max-len */
const proxyApp = require('express')();
const bodyParser = require('body-parser');
const router = require('./routes').router;
const config = require('@finos/git-proxy-common/src/config');
const db = require('./db');
const { GIT_PROXY_SERVER_PORT: proxyHttpPort } = require('../config/env').Vars;

const options = {
  inflate: true,
  limit: '100000kb',
  type: '*/*',
};

// Setup the proxy middleware
proxyApp.use(bodyParser.raw(options));
proxyApp.use('/', router);

const start = async () => {
  // Check to see if the default repos are in the repo list
  const defaultAuthorisedRepoList =
    config.getAuthorisedList() as AuthorisedRepo[];
  const allowedList = await db.getRepos();

  defaultAuthorisedRepoList.forEach(async (x) => {
    const found = allowedList.find(
      (y) => y.project == x.project && x.name == y.name,
    );
    if (!found) {
      await db.createRepo(x);
      await db.addUserCanPush('git-proxy', 'admin');
      await db.addUserCanAuthorise('git-proxy', 'admin');
    }
  });

  proxyApp.listen(proxyHttpPort, () => {
    console.log(`Listening on ${proxyHttpPort}`);
  });

  return proxyApp;
};

module.exports.start = start;
