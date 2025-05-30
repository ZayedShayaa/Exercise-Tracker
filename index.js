// 1. تحميل الوحدات والمتغيرات البيئية
require('dotenv').config(); // لتحميل متغيرات البيئة من ملف .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // للتعامل مع مسارات الملفات

const app = express(); // إنشاء تطبيق Express

// 2. الاتصال بقاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully!'))
.catch(err => console.error('MongoDB connection error:', err));

// 3. تعريف مخططات Mongoose (Models)
// هذا بديل لملف models/user.js
const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String } // تاريخ التمرين كسلسلة نصية (مثال: Mon Jan 01 1990)
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSchema] // مصفوفة من التمارين
});

const User = mongoose.model('User', userSchema); // إنشاء الموديل بناءً على المخطط

// 4. Middleware (البرمجيات الوسيطة)
app.use(cors()); // تفعيل CORS للسماح بطلبات من نطاقات مختلفة
app.use(express.static(path.join(__dirname, 'public'))); // لخدمة الملفات الثابتة (مثل CSS إذا أضفتها)
app.use(express.urlencoded({ extended: true })); // لتحليل بيانات النموذج (form data)
// app.use(express.json()); // إذا كنت تخطط لإرسال JSON من الواجهة الأمامية، يمكن تفعيلها أيضًا

// 5. نقاط نهاية API (Routes)
// هذه بديل لملف routes/api.js

// نقطة نهاية لعرض الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// POST /api/users - إنشاء مستخدم جديد
app.post('/api/users', async (req, res) => {
  const username = req.body.username; // استلام username من form data

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    if (err.code === 11000) { // MongoDB duplicate key error (اسم المستخدم موجود بالفعل)
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error creating user' });
  }
});

// GET /api/users - جلب قائمة بجميع المستخدمين
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id'); // جلب فقط username و _id
    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Server error getting users' });
  }
});

// POST /api/users/:_id/exercises - إضافة تمرين لسجل المستخدم
app.post('/api/users/:id/exercises', async (req, res) => {
  const userId = req.params.id;
  const { description, duration, date } = req.body; // استلام البيانات من form data

  // التحقق من الحقول المطلوبة
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // تهيئة التاريخ: إذا لم يتم توفيره، استخدم التاريخ الحالي
    let exerciseDate;
    if (date) {
      // حاول تحليل التاريخ المدخل
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) { // التحقق من صلاحية التاريخ
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      exerciseDate = parsedDate.toDateString(); // تحويل التاريخ إلى DateString
    } else {
      exerciseDate = new Date().toDateString(); // التاريخ الحالي بصيغة DateString
    }

    const newExercise = {
      description,
      duration: parseInt(duration), // تحويل المدة إلى عدد صحيح
      date: exerciseDate
    };

    user.log.push(newExercise); // إضافة التمرين إلى سجل المستخدم
    const updatedUser = await user.save(); // حفظ التغييرات في قاعدة البيانات

    // العودة ببيانات المستخدم والتمرين المضاف بنفس بنية الاستجابة المطلوبة
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date
    });

  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).json({ error: 'Server error adding exercise' });
  }
});

// GET /api/users/:_id/logs - جلب سجل تمارين المستخدم
app.get('/api/users/:id/logs', async (req, res) => {
  const userId = req.params.id;
  const { from, to, limit } = req.query; // استلام parameters (من، إلى، حد)

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userLog = user.log;

    // تطبيق فلترة 'from' (من تاريخ معين)
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        userLog = userLog.filter(ex => new Date(ex.date).getTime() >= fromDate.getTime());
      }
    }

    // تطبيق فلترة 'to' (إلى تاريخ معين)
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        userLog = userLog.filter(ex => new Date(ex.date).getTime() <= toDate.getTime());
      }
    }

    // تطبيق 'limit' (الحد الأقصى لعدد السجلات)
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) { // تأكد من أن Limit رقم موجب
        userLog = userLog.slice(0, limitNum);
      }
    }

    // العودة ببيانات السجل بنفس بنية الاستجابة المطلوبة
    res.json({
      _id: user._id,
      username: user.username,
      count: userLog.length,
     log: userLog.map(ex => ({
  description: ex.description,
  duration: ex.duration,
  date: ex.date // <--- فقط استخدم القيمة المخزنة مباشرة!
}))
    });

  } catch (err) {
    console.error('Error getting user log:', err);
    res.status(500).json({ error: 'Server error getting user log' });
  }
});

// 6. معالجة الأخطاء 404
app.use((req, res, next) => {
  res.status(404).send('404 Not Found');
});

// 7. معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 8. بدء تشغيل الخادم
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});