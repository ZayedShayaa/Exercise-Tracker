const express = require('express');
const dns = require('dns');
const { URL } = require('url');

const app = express();

app.use(express.urlencoded({ extended: false }));

const urlDatabase = [];
let id = 1;

// POST endpoint to shorten URL
app.post('/api/shorturl', (req, res) => {
  let originalUrl = req.body.url;

  // تحقق أولي من الشكل (لازم يبدأ بـ http:// أو https://)
  if (!originalUrl.match(/^(http|https):\/\/.+$/)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // استخدم كائن URL لفصل hostname
    const urlObj = new URL(originalUrl);

    dns.lookup(urlObj.hostname, (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      } else {
        // تحقق لو الرابط موجود مسبقاً (إرجاع نفس الاختصار)
        const found = urlDatabase.find(item => item.original_url === originalUrl);
        if (found) {
          return res.json({ original_url: found.original_url, short_url: found.short_url });
        }

        // إضافة الرابط إلى قاعدة البيانات المؤقتة
        urlDatabase.push({ original_url: originalUrl, short_url: id });
        res.json({ original_url: originalUrl, short_url: id });
        id++;
      }
    });
  } catch {
    return res.json({ error: 'invalid url' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// GET endpoint لإعادة التوجيه حسب رقم الاختصار
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = Number(req.params.short_url);
  const found = urlDatabase.find(item => item.short_url === shortUrl);

  if (found) {
    return res.redirect(found.original_url);
  } else {
    return res.json({ error: 'No short URL found for the given input' });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
