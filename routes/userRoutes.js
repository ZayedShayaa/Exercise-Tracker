const express = require("express");
const router = express.Router(); // <--- مهم: استخدام express.Router()
const User = require("../models/user"); // تأكد من المسار الصحيح لنموذج User

// POST /api/users - Create a new user

// POST /api/users - Create a new user
router.post("/", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const username = req.body.username;
    if (!username) return res.status(400).send("Username is required");

    let foundUser = await User.findOne({ username });
    if (foundUser)
      return res.json({ username: foundUser.username, _id: foundUser._id });

    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/users - Get a list of all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "username _id"); // Select only username and _id
    res.json(users);
  } catch (err) {
    console.error(err); // سجل الخطأ لمراجعة السيرفر
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
