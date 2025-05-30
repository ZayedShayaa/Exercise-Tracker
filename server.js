const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// In-memory data storage
const users = [];
const exercises = [];

// Home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ✅ Create a new user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  const newUser = {
    username,
    _id: uuidv4(),
  };
  users.push(newUser);
  res.json(newUser);
});

// ✅ Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// ✅ Add exercise to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const user = users.find(u => u._id === req.params._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { description, duration, date } = req.body;
  if (!description || !duration) {
    return res.status(400).json({ error: 'description and duration are required' });
  }

  const parsedDate = date ? new Date(date) : new Date();
  if (parsedDate.toString() === 'Invalid Date') {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const exercise = {
    _id: user._id,
    username: user.username,
    description,
    duration: parseInt(duration),
    date: parsedDate.toDateString()
  };

  exercises.push(exercise);
  res.json(exercise);
});

// ✅ Get exercise logs
app.get('/api/users/:_id/logs', (req, res) => {
  const user = users.find(u => u._id === req.params._id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let log = exercises.filter(ex => ex._id === user._id);

  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() !== 'Invalid Date') {
      log = log.filter(ex => new Date(ex.date) >= fromDate);
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() !== 'Invalid Date') {
      log = log.filter(ex => new Date(ex.date) <= toDate);
    }
  }

  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map(({ description, duration, date }) => ({
      description,
      duration,
      date: new Date(date).toDateString() // ✅ هذا مهم للتوافق مع التحدي
    }))
  });
});

// Start the server
const listener = app.listen(3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
