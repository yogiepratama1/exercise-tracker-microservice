"use strict";

var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
require("dotenv").config();
var cors = require("cors");
var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
});

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//Create Schema
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String,
});
const exerciseSchema = new Schema({
  userId: String,
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get("/api/users", function (req, res) {
  try {
    User.find({}, function (err, data) {
      return res.json(data);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});

app.post("/api/users", async function (req, res) {
  const username = req.body.username;

  try {
    // check if its already in the database
    let findOne = await User.findOne({
      username: username,
    });
    if (findOne) {
      res.json({
        username: findOne.username,
        _id: findOne._id,
      });
    } else {
      // if its not exist yet then create new one and response with the result
      findOne = new User({
        username: username,
      });
      await findOne.save();
      return res.json({
        username: findOne.username,
        _id: findOne._id,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Server erorr...");
  }
});

app.post("/api/users/:_id/exercises", function (req, res) {
  try {
    User.findById(req.params._id, function (err, data) {
      let exercise = new Exercise({
        userId: req.params._id,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: req.body.date ? new Date(req.body.date) : new Date(),
      });
      exercise.save(function (err, data2) {
        return res.json({
          username: data.username,
          description: data2.description,
          duration: data2.duration,
          date: new Date(data2.date).toDateString(),
          _id: data._id,
        });
      });
    });
  } catch (err) {
    console.log(req.query.from);
    console.log(req.query.to);
    res.status(500).json("Server error");
  }
});

// app.get("/api/users/:_id/logs", function (req, res) {
//   try {
//     User.findById(req.params._id, function (err, data) {
//       console.log(data);
//       Exercise.find({
//         userId: String(req.params._id),
//         date: {
//           $gte: new Date(req.query.from),
//           $lte: new Date(req.query.to),
//         },
//       })
//         .limit(parseInt(req.query.limit ? req.query.limit : 0))
//         .exec(function (err, data2) {
//           if (!err) {
//             return res.json({
//               _id: data._id,
//               username: data.username,
//               count: data2.length,
//               log: data2.map((item) => {
//                 return {
//                   description: item.description,
//                   duration: item.duration,
//                   date: new Date(item.date).toDateString(),
//                 };
//               }),
//             });
//           } else {
//             console.log(err);
//             return res.json({ error: "User not found" });
//           }
//         });
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json("Server error");
//   }
// });

app.get("/api/users/:_id/logs", function (req, res) {
  let userId = req.params._id;
  let findConditions = { userId: userId };

  if (
    (req.query.from !== undefined && req.query.from !== "") ||
    (req.query.to !== undefined && req.query.to !== "")
  ) {
    findConditions.date = {};

    if (req.query.from !== undefined && req.query.from !== "") {
      findConditions.date.$gte = new Date(req.query.from);
    }

    if (findConditions.date.$gte == "Invalid Date") {
      return res.json({ error: "from date is invalid" });
    }

    if (req.query.to !== undefined && req.query.to !== "") {
      findConditions.date.$lte = new Date(req.query.to);
    }

    if (findConditions.date.$lte == "Invalid Date") {
      return res.json({ error: "to date is invalid" });
    }
  }

  let limit = req.query.limit !== undefined ? parseInt(req.query.limit) : 0;

  if (isNaN(limit)) {
    return res.json({ error: "limit is not a number" });
  }

  User.findById(userId, function (err, data) {
    if (!err && data !== null) {
      Exercise.find(findConditions)
        .sort({ date: "asc" })
        .limit(limit)
        .exec(function (err2, data2) {
          if (!err2) {
            return res.json({
              _id: data["_id"],
              username: data["username"],
              log: data2.map(function (e) {
                return {
                  description: e.description,
                  duration: e.duration,
                  date: new Date(e.date).toDateString(),
                };
              }),
              count: data2.length,
            });
          }
        });
    } else {
      return res.json({ error: "user not found" });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
