const express = require("express");
const router = express.Router(); // <--- مهم: استخدام express.Router()
const User = require("../models/user"); // تأكد من المسار الصحيح لنموذج User
const Exercise = require("../models/exercise"); // تأكد من المسار الصحيح لنموذج Exercise

// POST /api/users/:_id/exercises - Add an exercise
router.post("/:_id/exercises", async (req, res) => {
  // المسار هنا هو '/:_id/exercises' نسبة للروتر
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: "Description and duration are required" });
  }

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let exerciseDate = date ? new Date(date) : new Date();

    // Check if the date is valid
    if (isNaN(exerciseDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration), // Ensure duration is a number
      date: exerciseDate,
    });

    await newExercise.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/:_id/logs - Get user's exercise log
router.get("/:_id/logs", async (req, res) => {
  // المسار هنا هو '/:_id/logs' نسبة للروتر
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let dateFilter = {};
    if (from) {
      dateFilter.$gte = new Date(from + "T00:00:00.000Z");
      if (isNaN(dateFilter.$gte.getTime())) {
        return res.status(400).json({ error: "Invalid 'from' date format" });
      }
    }
    if (to) {
      dateFilter.$lte = new Date(to + "T23:59:59.999Z");
      if (isNaN(dateFilter.$lte.getTime())) {
        return res.status(400).json({ error: "Invalid 'to' date format" });
      }
    }

    let query = { userId: _id };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    let exercises = Exercise.find(query);

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ error: "Invalid 'limit' value" });
      }
      exercises = exercises.limit(parsedLimit);
    }

    const log = await exercises.exec();

    const formattedLog = log.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: formattedLog.length,
      _id: user._id,
      log: formattedLog,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
