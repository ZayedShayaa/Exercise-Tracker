require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// الاتصال بقاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected...'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors()); // تفعيل CORS
app.use(express.static(path.join(__dirname, 'public'))); // لخدمة الملفات الثابتة (مثل CSS)
app.use(express.urlencoded({ extended: true })); // تحليل بيانات النموذج (form data)
// app.use(express.json()); // إذا كنت تخطط لإرسال JSON من الواجهة الأمامية، يمكن تفعيلها أيضًا

// استيراد مسارات API
const apiRoutes = require('./routes/exercise');

// نقطة نهاية لعرض الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,  '/view/index.html'));
});

// استخدام مسارات API عند /api/users
app.use('/api/users', apiRoutes);

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
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});