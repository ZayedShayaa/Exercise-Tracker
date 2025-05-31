require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

/* 🔹 الاتصال بقاعدة البيانات */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

/* 🔹 إعداد Middleware */
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));

/* 🔹 عرض الصفحة الرئيسية */
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

/* 🔹 إعداد نماذج Mongoose */
const exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSessionSchema],
});

const User = mongoose.model("User", userSchema);

/* 🔹 API Endpoints */

// 🟢 إنشاء مستخدم جديد
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) return res.status(400).send('Username is required');

    let foundUser = await User.findOne({ username });
    if (foundUser) return res.json({ username: foundUser.username, _id: foundUser._id });

    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 جلب جميع المستخدمين
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Server error getting users" });
  }
});

// 🟢 إضافة تمرين جديد لمستخدم معين
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    console.log("Received Request Data:", { userId, description, duration, date });

    const userFound = await User.findById(userId);
    if (!userFound) return res.status(404).json({ error: "User not found" });

    let exerciseDate = date ? new Date(date) : new Date();
    if (isNaN(exerciseDate.getTime())) return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });

    const newExercise = { description, duration: parseInt(duration), date: exerciseDate.toDateString() };
    userFound.log.push(newExercise);
    await userFound.save();

    res.json({ _id: userFound._id, username: userFound.username, ...newExercise });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Server error adding exercise" });
  }
});

// 🟢 جلب سجل التمارين للمستخدم مع فلترة
app.get("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;

    console.log("Fetching last exercise for User ID:", userId);

    const userFound = await User.findById(userId);
    if (!userFound) return res.status(404).json({ error: "User not found" });

    // التأكد من أن هناك تمارين مسجلة
    if (userFound.log.length === 0) {
      return res.status(404).json({ error: "No exercises found for this user" });
    }

    // جلب آخر تمرين فقط
    const lastExercise = userFound.log[userFound.log.length - 1];

    res.json({
      _id: userFound._id,
      username: userFound.username,
      date: new Date(lastExercise.date).toDateString(),
      duration: lastExercise.duration,
      description: lastExercise.description,
    });

  } catch (err) {
    console.error("Error fetching last exercise:", err);
    res.status(500).json({ error: "Server error fetching exercise" });
  }
});

// 🟢 مسار إضافي لجلب سجل التمارين بالتنسيق المطلوب
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    let userLog = user.log.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: new Date(ex.date).toDateString()
      
    }));

    if (from) {
      const fromDate = new Date(from);
      userLog = userLog.filter(ex => new Date(ex.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      userLog = userLog.filter(ex => new Date(ex.date).getTime() <= toDate.getTime());
    }

    if (limit && !isNaN(parseInt(limit))) {
      userLog = userLog.slice(0, parseInt(limit));
    }

    res.json({ _id: user._id, username: user.username, count: userLog.length, log: userLog });

  } catch (err) {
    console.error("Error getting user log:", err);
    res.status(500).json({ error: "Server error getting user log" });
  }
});

/* 🔹 معالجة الأخطاء */
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

/* 🔹 تشغيل السيرفر */
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});