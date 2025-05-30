require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const exerciseRoutes = require('./routes/exercise');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.use('/api/users', exerciseRoutes);

app.get('/', (req, res) => {
  res.send('Exercise Tracker API');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
