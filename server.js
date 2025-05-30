require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
// const moment = require("moment"); // لا نحتاج لـ moment إذا استخدمنا Date API
// const shortId = require("shortid"); // FreeCodeCamp لا يتطلب shortId افتراضيًا، ولكن يمكن الإبقاء عليه إذا أردت

const app = express();

/*Connect to database*/
mongoose
  .connect(process.env.MONGO_URI, { // استخدام MONGO_URI كما هو متوقع في .env
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public")); // لا داعي لـ path.join هنا إذا كان public في نفس المستوى

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

/*Model*/
// مخطط التمرين: التاريخ سيكون من نوع Date
let exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date } // ✅ تغيير نوع التاريخ إلى Date
});

// مخطط المستخدم: _id يمكن أن يكون معرف MongoDB الافتراضي
let userSchema = new mongoose.Schema({
  // _id: { type: String, required: true, default: shortId.generate }, // يمكن أن يكون معرف MongoDB الافتراضي كافياً للاختبارات
  username: { type: String, required: true, unique: true }, // اسم المستخدم يجب أن يكون فريداً
  log: [exerciseSessionSchema]
});

let User = mongoose.model("User", userSchema); // User هو الموديل الرئيسي

/*Test 1 & 2: User creation and fetching all users*/
app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  try {
    const foundUser = await User.findOne({ username });
    if (foundUser) {
      // FreeCodeCamp قد يتوقع رسالة "Username Taken" في بعض الأحيان بدلاً من 409
      return res.send("Username Taken"); // كما كان في الكود الأول لديك
    } else {
      const newUser = new User({ username });
      const savedUser = await newUser.save();
      res.json({
        username: savedUser.username,
        _id: savedUser._id,
      });
    }
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Server error creating user" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id"); // جلب فقط username و _id
    res.json(users);
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Server error getting users" });
  }
});

/*Test 3: Add Exercise Session*/
app.post("/api/users/:_id/exercises", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const userId = req.params._id; // _id من req.params
  const { description, duration, date } = req.body; // البيانات من req.body

  if (!description || !duration) {
    return res.status(400).json({ error: "Description and duration are required." });
  }
  if (isNaN(parseInt(duration))) {
    return res.status(400).json({ error: "Duration must be a number." });
  }

  try {
    const userFound = await User.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    let exerciseDate;
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      exerciseDate = parsedDate; // ✅ حفظ كتاريخ (Date object)
    } else {
      exerciseDate = new Date(); // ✅ حفظ كتاريخ (Date object)
    }

    const newExercise = {
      description,
      duration: parseInt(duration),
      date: exerciseDate, // حفظ كـ Date object
    };

    userFound.log.push(newExercise);
    const updatedUser = await userFound.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString(), // ✅ تحويل لـ toDateString() عند الإخراج فقط
    });
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).json({ error: "Server error adding exercise" });
  }
});


/*Test 4, 5, 6: Get User Log with filters*/
app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id; // _id من req.params
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
        // لضمان تضمين اليوم الأخير بالكامل (23:59:59.999)
        toDate.setHours(23, 59, 59, 999);
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
      count: userLog.length, // count محسوب ديناميكيًا
      log: userLog.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString(), // ✅ تحويل لـ toDateString() عند الإخراج فقط
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


/*listener*/
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});