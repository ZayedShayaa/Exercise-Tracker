// 1. تحميل الوحدات والمتغيرات البيئية
require("dotenv").config(); // لتحميل متغيرات البيئة من ملف .env
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path"); // للتعامل مع مسارات الملفات

const app = express(); // إنشاء تطبيق Express

// 2. الاتصال بقاعدة البيانات MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 3. تعريف مخططات Mongoose (Models)
const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String }, // تاريخ التمرين كسلسلة نصية (مثال: Mon Jan 01 1990)
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSchema], // مصفوفة من التمارين
});

const User = mongoose.model("User", userSchema); // إنشاء الموديل بناءً على المخطط

// 4. Middleware (البرمجيات الوسيطة)
app.use(cors()); // تفعيل CORS للسماح بطلبات من نطاقات مختلفة
app.use(express.static(path.join(__dirname, "public"))); // لخدمة الملفات الثابتة (مثل CSS إذا أضفتها)
app.use(express.urlencoded({ extended: true })); // لتحليل بيانات النموذج (form data)

// 5. نقاط نهاية API (Routes)

// نقطة نهاية لعرض الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// POST /api/users - إنشاء مستخدم جديد
app.post("/api/users", async (req, res) => {
  const username = req.body.username; // استلام username من form data

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    if (err.code === 11000) {
      // MongoDB duplicate key error (اسم المستخدم موجود بالفعل)
      return res.status(409).json({ error: "Username already exists" });
    }
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Server error creating user" });
  }
});

// GET /api/users - جلب قائمة بجميع المستخدمين
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id"); // جلب فقط username و _id
    res.json(users);
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Server error getting users" });
  }
});

// POST /api/users/:_id/exercises - إضافة تمرين لسجل المستخدم
app.post("/api/users/:id/exercises", async (req, res) => {
  const userId = req.params.id;
  const { description, duration, date } = req.body; // استلام البيانات من form data

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
      exerciseDate = parsedDate.toDateString(); // حفظ التاريخ كسلسلة نصية بتنسيق DateString
    } else {
      exerciseDate = new Date().toDateString(); // التاريخ الحالي كسلسلة نصية بتنسيق DateString
    }

    const newExercise = {
      description,
      duration: parseInt(duration), // التأكد من أن duration هو رقم
      date: exerciseDate,
    };

    user.log.push(newExercise);
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date,
    });
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).json({ error: "Server error adding exercise" });
  }
});

// GET /api/users/:_id/logs - جلب سجل تمارين المستخدم
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
        // التأكد من أن التاريخ صالح
        userLog = userLog.filter(
          (ex) => new Date(ex.date).getTime() >= fromDate.getTime()
        );
      }
    }

    // تصفية حسب التاريخ "إلى"
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        // التأكد من أن التاريخ صالح
        userLog = userLog.filter(
          (ex) => new Date(ex.date).getTime() <= toDate.getTime()
        );
      }
    }

    // تطبيق حد السجلات
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        // التأكد من أن الحد رقم موجب
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
        date: ex.date, // هذا هو السطر الصحيح. لا تقم بأي تحويل هنا.
      })),
    });
  } catch (err) {
    console.error("Error getting user log:", err);
    res.status(500).json({ error: "Server error getting user log" });
  }
});

// 6. معالجة أخطاء 404
app.use((req, res, next) => {
  res.status(404).send("404 Not Found");
});

// 7. معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// 8. بدء تشغيل الخادم
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
