require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require('body-parser');
const urlParser = require('url');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false })); // مهم لاستقبال بيانات POST من form-url-encoded

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// تخزين الروابط
let urlDatabase = [];
let id = 1; // رقم مختصر يزيد تلقائي

// POST endpoint لاستقبال رابط
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  // التحقق من صحة الرابط باستخدام url module (فحص البروتوكول)
  let urlObject;
  try {
    urlObject = new URL(originalUrl);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // نتحقق من وجود الدومين باستخدام dns.lookup
  dns.lookup(urlObject.hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    } else {
      // هل الرابط موجود مسبقًا؟
      const found = urlDatabase.find(item => item.original_url === originalUrl);
      if (found) {
        // إذا موجود، نعيده بدون إضافة جديد
        res.json({ original_url: found.original_url, short_url: found.short_url });
      } else {
        // غير موجود، نضيفه مع ID جديد
        urlDatabase.push({ original_url: originalUrl, short_url: id });
        res.json({ original_url: originalUrl, short_url: id });
        id++;
      }
    }
  });
});

// GET endpoint لإعادة التوجيه
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = Number(req.params.short_url);
  const found = urlDatabase.find(item => item.short_url === shortUrl);

  if (found) {
    return res.redirect(found.original_url);
  } else {
    return res.json({ error: 'No short URL found for the given input' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
