const express = require('express');
const router = express.Router();
const User = require('../models/user'); // تأكد من المسار الصحيح لملف user.js

// Create new user
router.post('/', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    // يمكن أن يكون الخطأ بسبب أن اسم المستخدم موجود بالفعل (unique)
    if (err.code === 11000) { // كود الخطأ 11000 يشير إلى تكرار مفتاح فريد
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error(err);
    res.status(500).send('Error creating user');
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error getting users');
  }
});

// Add exercise
router.post('/:id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  
  // التحقق من أن المتغيرات موجودة
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newExercise = {
    description,
    duration: parseInt(duration), // تأكد من تحويل المدة إلى رقم
    // إذا كان التاريخ موجودًا، استخدمه، وإلا استخدم التاريخ الحالي
    date: date ? new Date(date).toDateString() : new Date().toDateString()
  };

  user.log.push(newExercise);
  try {
    await user.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date // التاريخ هنا هو بالفعل سلسلة نصية بالصيغة المطلوبة
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding exercise');
  }
});

// Get user log
router.get('/:id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let log = user.log;

  // فلترة السجل بناءً على التاريخ (من و إلى)
  if (from) {
    const fromDate = new Date(from);
    log = log.filter(ex => new Date(ex.date).getTime() >= fromDate.getTime()); // مقارنة الأوقات
  }
  if (to) {
    const toDate = new Date(to);
    log = log.filter(ex => new Date(ex.date).getTime() <= toDate.getTime()); // مقارنة الأوقات
  }

  // تطبيق حد السجل (limit)
  if (limit) {
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0) { // تأكد من أن Limit رقم موجب
      log = log.slice(0, limitNum);
    }
  }

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log: log.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date // <--- هذا هو التصحيح الرئيسي الذي يجعل الاختبار يمر
    }))
  });
});

module.exports = router;