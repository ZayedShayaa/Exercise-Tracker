const express = require('express');
const router = express.Router();
const User = require('../models/user');

// ✅ Create new user
router.post('/', async (req, res) => {
  const newUser = new User({ username: req.body.username });
  try {
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).send('Error creating user');
  }
});

// ✅ Get all users
router.get('/', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// ✅ Add exercise
router.post('/:id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newExercise = {
    description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString()
  };

  user.log.push(newExercise);
  await user.save();

  res.json({
    _id: user._id,
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date
  });
});

// ✅ Get user log with optional filters
router.get('/:id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let log = user.log;

  if (from) {
    const fromDate = new Date(from);
    log = log.filter(ex => new Date(ex.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    log = log.filter(ex => new Date(ex.date) <= toDate);
  }
  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log: log.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date
    }))
  });
});

module.exports = router;
