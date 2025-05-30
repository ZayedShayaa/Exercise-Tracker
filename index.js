const express = require('express');
const dns = require('dns');
const bodyParser = require('body-parser');
const app = express();

// تفعيل body-parser لقراءة بيانات POST
app.use(bodyParser.urlencoded({ extended: false }));

// تخزين مؤقت للروابط (في مشروع حقيقي استخدم DB)
const urlDatabase = [];
let id = 1;

// صفحة ترحيبية (اختياري)
app.get('/', (req, res) => {
  res.send('URL Shortener Microservice is running');
});

// نقطة النهاية لاستقبال الرابط المراد اختصاره
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  try {
    // نفصل hostname من الرابط
    const urlObj = new URL(originalUrl);

    // نتحقق من وجود hostname باستخدام dns.lookup
    dns.lookup(urlObj.hostname, (err, address) => {
      if (err) {
        // رابط غير صحيح أو غير موجود
        return res.json({ error: 'invalid url' });
      } else {
        // تحقق لو الرابط موجود مسبقاً
        let existing = urlDatabase.find(item => item.original_url === originalUrl);
        if (existing) {
          return res.json({ original_url: existing.original_url, short_url: existing.short_url });
        }

        // إضافة الرابط الجديد
        urlDatabase.push({ original_url: originalUrl, short_url: id });
        res.json({ original_url: originalUrl, short_url: id });
        id++;
      }
    });
  } catch (error) {
    // إذا الرابط غير صالح من البداية
    res.json({ error: 'invalid url' });
  }
});

// إعادة التوجيه عند استخدام رابط الاختصار
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = Number(req.params.short_url);
  const found = urlDatabase.find(item => item.short_url === shortUrl);

  if (found) {
    res.redirect(found.original_url);
  } else {
    res.json({ error: 'No short URL found for the given input' });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
