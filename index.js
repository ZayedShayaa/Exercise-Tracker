const express = require('express');
const cors = require('cors');
const app = express();

// enable CORS for FCC testing
app.use(cors());

// serve the static HTML file
app.use(express.static('public'));

// Main API Route
app.get("/api/:date?", (req, res) => {
  let { date } = req.params;

  // إذا لم يُعطى تاريخ
  if (!date) {
    const now = new Date();
    return res.json({ unix: now.getTime(), utc: now.toUTCString() });
  }

  // لو كانت أرقام فقط، نحولها إلى رقم (timestamp)
  if (/^\d+$/.test(date)) {
    date = parseInt(date);
  }

  const parsedDate = new Date(date);

  if (parsedDate.toString() === "Invalid Date") {
    return res.json({ error: "Invalid Date" });
  }

  return res.json({
    unix: parsedDate.getTime(),
    utc: parsedDate.toUTCString()
  });
});

// السطر الإجباري لمنصة FreeCodeCamp
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
