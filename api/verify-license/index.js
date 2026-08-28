'use strict';

const { createVerifyHandler } = require('../rate-limit.cjs');

const verifyLicense = createVerifyHandler();

module.exports = async function licenseVerification(context, request) {
  context.res = await verifyLicense(request);
};
