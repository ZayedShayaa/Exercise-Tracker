require("dotenv").config(); // لتحميل المتغيرات البيئية من ملف .env
const express = require("express");
const app = express();
const cors = require("cors"); // لتجاوز قيود سياسة نفس المصدر (CORS)
const mongoose = require("mongoose"); // للاتصال بقاعدة بيانات MongoDB

// استيراد نماذج البيانات (Models) إذا لم تكن موجودة في ملفات الـ routes
// (يمكنك نقل هذه الاستيرادات إلى ملفات الـ routes مباشرة إذا كنت تفضل ذلك)
const User = require("./models/user");
const Exercise = require("./models/exercise");

// استيراد ملفات المسارات (Routers)
const userRoutes = require("./routes/userRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");

// --- Middleware ---
// تمكين CORS لجميع الطلبات
app.use(cors());

// لجعل Express قادرًا على قراءة بيانات JSON المرسلة في جسم الطلب
app.use(express.json());

// لجعل Express قادرًا على قراءة بيانات URL-encoded (مثل البيانات المرسلة من النماذج HTML)
app.use(express.urlencoded({ extended: true }));

// لخدمة الملفات الثابتة (مثل style.css و script.js) من مجلد 'public'
app.use(express.static("public"));

// --- اتصال قاعدة البيانات ---
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err)); // رسالة خطأ أوضح

// --- المسارات الرئيسية ---
// المسار الأساسي لخدمة الصفحة الرئيسية (index.html)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// --- استخدام المسارات المنفصلة (Routers) ---
// جميع المسارات في userRoutes.js ستبدأ بـ /api/users
// مثال: router.post('/') في userRoutes.js سيصبح POST /api/users
app.use("/api/users", userRoutes);

// جميع المسارات في exerciseRoutes.js ستبدأ بـ /api/users
// مثال: router.post('/:_id/exercises') في exerciseRoutes.js سيصبح POST /api/users/:_id/exercises
// مثال: router.get('/:_id/logs') في exerciseRoutes.js سيصبح GET /api/users/:_id/logs
app.use("/api/users", exerciseRoutes);

// --- التعامل مع الأخطاء (اختياري) ---
// معالج لأي مسار غير موجود (404 Not Found)
app.use((req, res, next) => {
  res.status(404).send("<h1>404 Not Found</h1>"); // يمكنك عرض رسالة HTML أو ملف 404.html
});

// معالج الأخطاء العام: يلتقط الأخطاء التي تحدث في المسارات
app.use((err, req, res, next) => {
  console.error(err.stack); // اطبع الخطأ في الكونسول لتصحيح الأخطاء
  res.status(500).json({ error: "Something went wrong!" });
});

// --- بدء تشغيل الخادم ---
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
