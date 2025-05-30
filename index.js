const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('views'));

// بيانات مؤقتة (بدون قاعدة بيانات)
let users = [];       // [{ username, _id }]
let exercises = [];   // [{ userId, description, duration, date, _id }]

// توليد ID عشوائي بسيط
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// صفحة الإدخال الأساسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// إنشاء مستخدم جديد
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });

  const newUser = { username, _id: generateId() };
  users.push(newUser);
  res.json(newUser);
});

// جلب كل المستخدمين
app.get('/api/users', (req, res) => {
  res.json(users);
});

// إضافة تمرين لمستخدم
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let { description, duration, date } = req.body;
  if (!description || !duration) return res.status(400).json({ error: 'description and duration required' });

  duration = Number(duration);
  if (isNaN(duration)) return res.status(400).json({ error: 'duration must be a number' });

  date = date ? new Date(date) : new Date();
  if (date.toString() === 'Invalid Date') date = new Date();

  const exercise = {
    userId,
    description,
    duration,
    date,
    _id: generateId(),
  };
  exercises.push(exercise);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(),
    _id: user._id
  });
});

// عرض سجل التمارين لمستخدم (اختياري فلتر من - إلى - حد عدد)
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const user = users.find(u => u._id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let { from, to, limit } = req.query;

  let userExercises = exercises.filter(e => e.userId === userId);

  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() !== 'Invalid Date') {
      userExercises = userExercises.filter(e => e.date >= fromDate);
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() !== 'Invalid Date') {
      userExercises = userExercises.filter(e => e.date <= toDate);
    }
  }

  if (limit) {
    limit = Number(limit);
    if (!isNaN(limit)) {
      userExercises = userExercises.slice(0, limit);
    }
  }

  res.json({
    username: user.username,
    count: userExercises.length,
    _id: user._id,
    log: userExercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
