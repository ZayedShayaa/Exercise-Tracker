require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// الاتصال بقاعدة البيانات
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

// مخططات Mongoose
const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }, // ✅ تم تغيير النوع إلى Date
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSchema],
});

const User = mongoose.model("User", userSchema);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Routes

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// إنشاء مستخدم جديد
app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username already exists" });
    }
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Server error creating user" });
  }
});

// جلب جميع المستخدمين
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Server error getting users" });
  }
});

// إضافة تمرين جديد للمستخدم
app.post("/api/users/:id/exercises", async (req, res) => {
  const userId = req.params.id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res
      .status(400)
      .json({ error: "Description and duration are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let exerciseDate;
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res
          .status(400)
          .json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      exerciseDate = parsedDate; // ✅ حفظ كتاريخ (Date object)
    } else {
      exerciseDate = new Date(); // ✅ حفظ كتاريخ (Date object)
    }

    const newExercise = {
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    };

    user.log.push(newExercise);
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString(), // ✅ هنا يتم تحويل التاريخ لـ string قبل الإرسال
    });
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).json({ error: "Server error adding exercise" });
  }
});

// جلب سجل التمارين مع الفلاتر
app.get("/api/users/:id/logs", async (req, res) => {
  const userId = req.params.id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let userLog = user.log;

    // تصفية حسب التاريخ "من"
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        userLog = userLog.filter(
          (ex) => new Date(ex.date).getTime() >= fromDate.getTime()
        );
      }
    }

    // تصفية حسب التاريخ "إلى"
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        userLog = userLog.filter(
          (ex) => new Date(ex.date).getTime() <= toDate.getTime()
        );
      }
    }

    // تطبيق حد السجلات
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        userLog = userLog.slice(0, limitNum);
      }
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: userLog.length,
      log: userLog.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString(), // ✅ التحويل هنا
      })),
    });
  } catch (err) {
    console.error("Error getting user log:", err);
    res.status(500).json({ error: "Server error getting user log" });
  }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send("404 Not Found");
});

// general error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// تشغيل السيرفر
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
