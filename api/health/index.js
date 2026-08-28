'use strict';

module.exports = async function health(context) {
  context.res = {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      status: 'ok',
      product: 'photo-metadata-inbox',
      version: '1.1.0',
      build: globalThis.process?.env.GITHUB_SHA || globalThis.process?.env.WEBSITE_DEPLOYMENT_ID || 'production'
    })
  };
};
