const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public")); // تخدم ملفات الـ HTML وJS وCSS
app.set("view engine", "ejs"); // مش ضروري إذا ما استخدمت قوالب EJS

// تخزين بيانات مؤقت (بدون قاعدة بيانات)
const users = [];
const exercises = [];

// عرض الصفحة الرئيسية (الـ HTML)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// إنشاء مستخدم
app.post("/api/users", (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: "username required" });
  const user = { username, _id: uuidv4() };
  users.push(user);
  res.json(user);
});

// عرض جميع المستخدمين
app.get("/api/users", (req, res) => {
  res.json(users);
});

// إضافة تمرين
app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  const user = users.find((u) => u._id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { description, duration, date } = req.body;
  if (!description || !duration)
    return res.status(400).json({ error: "description and duration required" });

  const exerciseDate = date ? new Date(date) : new Date();
  if (exerciseDate.toString() === "Invalid Date")
    return res.status(400).json({ error: "Invalid date format" });

  const exercise = {
    description,
    duration: parseInt(duration),
    date: exerciseDate.toDateString(),
    _id: userId,
  };
  exercises.push(exercise);

  res.json({
    _id: user._id,
    username: user.username,
    date: exercise.date,
    duration: exercise.duration,
    description: exercise.description,
  });
});

// جلب سجل التمارين مع فلترة
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const user = users.find((u) => u._id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  let userExercises = exercises.filter((ex) => ex._id === userId);

  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    if (fromDate.toString() !== "Invalid Date")
      userExercises = userExercises.filter(
        (ex) => new Date(ex.date) >= fromDate
      );
  }

  if (to) {
    const toDate = new Date(to);
    if (toDate.toString() !== "Invalid Date")
      userExercises = userExercises.filter((ex) => new Date(ex.date) <= toDate);
  }

  if (limit) {
    userExercises = userExercises.slice(0, parseInt(limit));
  }

  const log = userExercises.map(({ description, duration, date }) => ({
    description,
    duration,
    date,
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log,
  });
});

// تشغيل السيرفر
const listener = app.listen(3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
