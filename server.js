require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // لاستخدام مسارات الملفات بشكل صحيح

const app = express();

// إعداد الاتصال بقاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Middleware
app.use(cors()); // تفعيل CORS للسماح بطلبات من نطاقات مختلفة
app.use(express.json()); // تحليل طلبات JSON
app.use(express.urlencoded({ extended: true })); // تحليل بيانات النموذج (form data)

// نقطة نهاية لعرض الصفحة الرئيسية
// تأكد من أن مسار 'views' صحيح بالنسبة لمكان server.js
app.use(express.static(path.join(__dirname, 'public'))); // لتقديم ملفات CSS/JS الثابتة إذا كانت في مجلد public
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// استيراد واستخدام مسارات API
const apiRouter = require('./routes/api'); // تأكد من أن المسار صحيح لمكان api.js
app.use('/api/users', apiRouter); // استخدام الراوتر عند المسار /api/users

// معالجة الأخطاء 404
app.use((req, res, next) => {
  res.status(404).send('404 Not Found');
});

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// بدء تشغيل الخادم
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Your app is listening on port ${port}`);
});