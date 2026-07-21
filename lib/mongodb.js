// lib/mongodb.js
// 簡化版連線模組：不使用 @vercel/functions 的 attachDatabasePool，
// 改用最單純、相容性最好的手動連線快取方式，降低出錯風險。
// （若之後想優化 Fluid Compute 下的連線釋放，可再加回 attachDatabasePool，
//   但務必包在 try/catch 裡，避免模組載入階段就讓整個函式當機。）
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn('[mongodb] 尚未設定環境變數 MONGODB_URI');
}

const options = {
  appName: 'ipas-quiz',
  maxIdleTimeMS: 5000,
};

// 用 globalThis 快取連線，讓同一個函式實例的多次呼叫可以重複使用，
// 不需要每次請求都重新建立連線。
let client = globalThis.__ipasMongoClient;
if (!client && uri) {
  try {
    client = new MongoClient(uri, options);
    globalThis.__ipasMongoClient = client;
  } catch (e) {
    console.error('[mongodb] 建立 MongoClient 失敗：', e);
    client = null;
  }
}

module.exports = { client, uri };
