// api/progress.js
// Vercel Serverless Function — 用官方 MongoDB 驅動存取進度。
// 環境變數：MONGODB_URI（Vercel × MongoDB Atlas 整合會自動設定），不會出現在前端網頁。
let mongo;
let loadError = null;
try {
  mongo = require('../lib/mongodb');
} catch (e) {
  // 若連 require 都失敗（例如套件安裝有誤），也要能回傳清楚的錯誤，而不是讓函式直接崩潰
  loadError = e;
}

const DB_NAME = process.env.MONGODB_DB || 'ipas_quiz';
const COLL = 'progress';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 個人工具用 *；要更嚴謹可改成你的網站網域
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (loadError) {
    res.status(500).json({ error: '模組載入失敗：' + String(loadError.message || loadError) });
    return;
  }
  const { client, uri } = mongo;
  if (!uri || !client) {
    res.status(500).json({ error: '尚未設定環境變數 MONGODB_URI，或 MongoClient 建立失敗' });
    return;
  }

  try {
    const col = client.db(DB_NAME).collection(COLL);

    if (req.method === 'GET') {
      const key = String((req.query && req.query.key) || '').trim();
      if (!key) { res.status(400).json({ error: 'missing key' }); return; }
      const doc = await col.findOne({ _id: key });
      res.status(200).json({
        ok: true,
        data: doc ? {
          progress: doc.progress || {},
          starred: doc.starred || {},
          theme: doc.theme || null,
          updatedAt: doc.updatedAt || null
        } : null
      });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      body = body || {};
      const key = String(body.key || '').trim();
      if (!key) { res.status(400).json({ error: 'missing key' }); return; }

      const size = JSON.stringify(body).length;
      if (size > 2_000_000) { res.status(413).json({ error: 'payload too large' }); return; }

      const update = {
        progress: body.progress || {},
        starred: body.starred || {},
        theme: body.theme || null,
        updatedAt: new Date()
      };
      await col.updateOne({ _id: key }, { $set: update }, { upsert: true });
      res.status(200).json({ ok: true, updatedAt: update.updatedAt });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
