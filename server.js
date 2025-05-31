require("dotenv").config(); 
const express = require("express");
const app = express();
const cors = require("cors"); 
const mongoose = require("mongoose"); 


const User = require("./models/user");
const Exercise = require("./models/exercise");


const userRoutes = require("./routes/userRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");


app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


app.use(express.static("public"));


mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err)); 

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use("/api/users", userRoutes);

app.use("/api/users", exerciseRoutes);


app.use((req, res, next) => {
  res.status(404).send("<h1>404 Not Found</h1>");
});


app.use((err, req, res, next) => {
  console.error(err.stack); 
  res.status(500).json({ error: "Something went wrong!" });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
