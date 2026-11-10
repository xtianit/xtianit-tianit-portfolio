// Vercel runs every file in /api as a serverless function. This one hands all requests to the Express app.
module.exports = require('../server/server.js');
