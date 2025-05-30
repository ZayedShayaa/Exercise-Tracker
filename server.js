require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors"); // Middleware for enabling CORS
const mongoose = require("mongoose"); // ODM for MongoDB
const bodyParser = require("body-parser"); // Middleware to parse request bodies

const app = express(); // Initialize Express application

/* Connect to database */
// Connect to MongoDB using the URI from environment variables
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true, // Use new URL parser
    useUnifiedTopology: true, // Use new server discovery and monitoring engine
  })
  .then(() => console.log("MongoDB connected successfully!")) // Log success
  .catch((err) => console.error("MongoDB connection error:", err)); // Log error

// Middleware setup
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.urlencoded({ extended: false })); // Parse URL-encoded bodies (for form data)
app.use(bodyParser.json()); // Parse JSON bodies
app.use(express.static("public")); // Serve static files from the 'public' directory

// Root route to serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

/* Mongoose Models */

// Schema for an individual exercise session
let exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true }, // Description of the exercise
  duration: { type: Number, required: true }, // Duration of the exercise in minutes
  date: { type: Date }, // Date of the exercise (defaults to current date if not provided)
});

// Schema for a user
let userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Unique username for the user
  log: [exerciseSessionSchema], // Array of exercise sessions for the user
});

// Create the User model from the userSchema
let User = mongoose.model("User", userSchema);

/* API Endpoints */

// POST /api/users - Create a new user
app.post("/api/users", async (req, res) => {
  const username = req.body.username; // Get username from request body

  // Validate if username is provided
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // Check if a user with the same username already exists
    const foundUser = await User.findOne({ username });
    if (foundUser) {
      // If user exists, return "Username Taken" as per FreeCodeCamp test requirements
      return res.send("Username Taken");
    } else {
      // If username is unique, create a new user
      const newUser = new User({ username });
      const savedUser = await newUser.save(); // Save the new user to the database
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

// GET /api/users - Get a list of all users
app.get("/api/users", async (req, res) => {
  try {
    // Find all users and select only username and _id fields
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Server error getting users" });
  }
});

// POST /api/users/:_id/exercises - Add an exercise session for a user
app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id; // Get user ID from URL parameters
  const { description, duration, date } = req.body; // Get exercise details from request body

  // Validate required fields
  if (!description || !duration) {
    return res.status(400).json({ error: "Description and duration are required." });
  }
  // Validate duration is a number
  if (isNaN(parseInt(duration))) {
    return res.status(400).json({ error: "Duration must be a number." });
  }

  try {
    // Find the user by ID
    const userFound = await User.findById(userId);
    if (!userFound) {
      return res.status(404).json({ error: "User not found" });
    }

    let exerciseDate;
    // Parse and validate the date if provided
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      }
      exerciseDate = parsedDate; // Use the parsed date
    } else {
      exerciseDate = new Date(); // If no date, use current date
    }

    // Create the new exercise object
    const newExercise = {
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    };

    userFound.log.push(newExercise); // Add the new exercise to the user's log
    const updatedUser = await userFound.save(); // Save the updated user document

    // Respond with user and new exercise details
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString(), // Format date for response
    });
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).json({ error: "Server error adding exercise" });
  }
});

// GET /api/users/:_id/logs - Get user's exercise log with optional filters
app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id; // Get user ID from URL parameters
  const { from, to, limit } = req.query; // Get filter parameters from query string

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let userLog = user.log; // Get the user's full exercise log

    // Filter by 'from' date
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        userLog = userLog.filter(
          (ex) => new Date(ex.date).getTime() >= fromDate.getTime()
        );
      }
    }

    // Filter by 'to' date
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        // Set time to end of the day to include all exercises on the 'to' date
        toDate.setHours(23, 59, 59, 999);
        userLog = userLog.filter(
          (ex) => new Date(ex.date).getTime() <= toDate.getTime()
        );
      }
    }

    // Apply limit to the filtered log
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        userLog = userLog.slice(0, limitNum);
      }
    }

    // Respond with user details, count of filtered exercises, and the filtered log
    res.json({
      _id: user._id,
      username: user.username,
      count: userLog.length, // Dynamic count based on filters
      log: userLog.map((ex) => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString(), // Format date for response
      })),
    });
  } catch (err) {
    console.error("Error getting user log:", err);
    res.status(500).json({ error: "Server error getting user log" });
  }
});

/* Error Handling Middleware */

// 404 Not Found handler for any unhandled routes
app.use((req, res, next) => {
  res.status(404).send("404 Not Found");
});

// General error handler for any errors that occur in the application
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).send("Something broke!"); // Send a generic error message
});

/* Listener */

// Start the Express server and listen on the specified port
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
