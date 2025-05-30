const express = require('express');
const router = express.Router();
const User = require('../models/user'); // تأكد من المسار الصحيح لملف user.js

// 1. POST /api/users - Create a new user
router.post('/', async (req, res) => {
  const username = req.body.username; // استلام username من form data

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    // العودة بنفس بنية الاستجابة المطلوبة: { username: "...", _id: "..." }
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    if (err.code === 11000) { // MongoDB duplicate key error
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error creating user' });
  }
});

// 2. GET /api/users - Get a list of all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id'); // جلب فقط username و _id
    // العودة بمصفوفة من كائنات المستخدمين
    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Server error getting users' });
  }
});

// 3. POST /api/users/:_id/exercises - Add an exercise to a user's log
router.post('/:id/exercises', async (req, res) => {
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
      exerciseDate = parsedDate.toDateString();
    } else {
      exerciseDate = new Date().toDateString(); // التاريخ الحالي بصيغة DateString
    }

    const newExercise = {
      description,
      duration: parseInt(duration), // تحويل المدة إلى عدد صحيح
      date: exerciseDate
    };

    user.log.push(newExercise);
    const updatedUser = await user.save();

    // العودة ببيانات المستخدم والتمرين المضاف بنفس بنية الاستجابة المطلوبة
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date // التاريخ بصيغة toDateString()
    });

  } catch (err) {
    console.error('Error adding exercise:', err);
    res.status(500).json({ error: 'Server error adding exercise' });
  }
});

// 4. GET /api/users/:_id/logs - Get a user's exercise log
router.get('/:id/logs', async (req, res) => {
  const userId = req.params.id;
  const { from, to, limit } = req.query; // استلام parameters (من، إلى، حد)

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userLog = user.log;

    // تطبيق فلترة 'from'
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        userLog = userLog.filter(ex => new Date(ex.date).getTime() >= fromDate.getTime());
      }
    }

    // تطبيق فلترة 'to'
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        userLog = userLog.filter(ex => new Date(ex.date).getTime() <= toDate.getTime());
      }
    }

    // تطبيق 'limit'
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
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
        date: ex.date // هذا هو السطر الحاسم الذي يضمن أن التاريخ بصيغة DateString
      }))
    });

  } catch (err) {
    console.error('Error getting user log:', err);
    res.status(500).json({ error: 'Server error getting user log' });
  }
});

module.exports = router;