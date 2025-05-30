const mongoose = require('mongoose');

// مخطط التمرين الفردي
const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String } // تاريخ التمرين كسلسلة نصية (مثال: Mon Jan 01 1990)
});

// مخطط المستخدم الذي يحتوي على سجل التمارين
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [exerciseSchema] // مصفوفة من التمارين
});

module.exports = mongoose.model('User', userSchema);