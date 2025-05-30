const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

mongoose.connect('mongodb://127.0.0.1:27017/exercisetracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  _id: { type: String, default: () => uuidv4() },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// صفحة البداية - يمكنك ربطها بملف HTML لو تريد
app.get('/', (req, res) => {
  res.send('Welcome to Exercise Tracker API');
});

// 1. إنشاء مستخدم جديد
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    // هل المستخدم موجود؟ (تجنب تكرار)
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. الحصول على قائمة كل المستخدمين
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { _id: 1, username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. إضافة تمرين لمستخدم معين
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  let exerciseDate = date ? new Date(date) : new Date();
  if (exerciseDate.toString() === 'Invalid Date') {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: Number(duration),
      date: exerciseDate,
    });

    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. جلب سجل التمارين مع خيارات from و to و limit
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filter = { userId: user._id };

    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (fromDate.toString() === 'Invalid Date') {
          return res.status(400).json({ error: 'Invalid from date' });
        }
        filter.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (toDate.toString() === 'Invalid Date') {
          return res.status(400).json({ error: 'Invalid to date' });
        }
        filter.date.$lte = toDate;
      }
    }

    let query = Exercise.find(filter).select('description duration date -_id');

    if (limit) {
      const limitNum = Number(limit);
      if (isNaN(limitNum) || limitNum <= 0) {
        return res.status(400).json({ error: 'Invalid limit number' });
      }
      query = query.limit(limitNum);
    }

    const exercises = await query.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// بدء الخادم
const listener = app.listen(3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
