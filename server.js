require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(`${process.cwd()}/public`));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.use('/api/users', userRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
