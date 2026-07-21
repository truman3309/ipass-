// lib/mongodb.js
const { MongoClient } = require('mongodb');
const { attachDatabasePool } = require('@vercel/functions');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn('[mongodb] 尚未設定環境變數 MONGODB_URI');
}

const options = {
  appName: 'ipas-quiz',
  maxIdleTimeMS: 5000,
};

let client = globalThis.__ipasMongoClient;
if (!client && uri) {
  client = new MongoClient(uri, options);
  attachDatabasePool(client);
  globalThis.__ipasMongoClient = client;
}

module.exports = { client, uri };
