const express = require('express');
const app = express();

const path = require('path');

// عرض الصفحة الرئيسية من views/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/view/index.html'));
});
app.get('/api/:date?', (req, res) => {
  let dateString = req.params.date;

  if (!dateString) {
    return res.json({
      unix: Date.now(),
      utc: new Date().toUTCString()
    });
  }

  // لو التاريخ فقط أرقام (timestamp) نحوله لعدد صحيح
  if (/^\d+$/.test(dateString)) {
    dateString = parseInt(dateString);
  }

  const date = new Date(dateString);

  if (date.toString() === "Invalid Date") {
    return res.json({ error: "Invalid Date" });
  }

  res.json({
    unix: date.getTime(),
    utc: date.toUTCString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
