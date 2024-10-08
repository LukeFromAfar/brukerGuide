const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');

app.use(cookieParser());

app.use("/uploads", express.static("uploads"));
const secretKey = process.env.JWT_SECRET_KEY;

const Schema = mongoose.Schema;

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Specify the upload folder
  },
  filename: function (req, file, cb) {
    // Declare and get the file extension
    const ext = path.extname(file.originalname);
    console.log("EXT", ext);

    // Generate a unique filename using a timestamp and the original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const uploads = multer({
  storage: diskStorage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: File type not supported"));
  },
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
      return res.status(403).send('Access Denied: No Token Provided!');
  }

  try {
      const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = verified; // This should have the user details
      next();
  } catch (error) {
      return res.status(401).send('Invalid Token');
  }
}

function checkIfAuthenticated(req, res, next) {
  const token = req.cookies.token || req.headers['authorization'];

  if (token) {
      try {
          jwt.verify(token, process.env.JWT_SECRET_KEY);
          return res.redirect('/dashboard');  // Redirect to dashboard if token is valid
      } catch (err) {
          // Token is invalid, proceed to login
          return next();
      }
  } else {
      // No token found, proceed to login
      next();
  }
}

// Protect the newGuide route
app.get("/newGuide", verifyToken, (req, res) => {
  res.render("newGuide");
});


mongoose
  .connect("mongodb://127.0.0.1:27017/userGuide")
  .then(() => console.log("connected!"))
  .catch((error) => console.log("error", error));

const saltRounds = 10;

app.get("/", async (req, res) => {
  try {
    const guides = await Guides.find(); // Fetch all guides from the database
    res.render("index", { guides }); // Pass the guides to the index view
  } catch (error) {
    console.error("Error fetching guides:", error);
    res.status(500).send("Internal server error");
  }
});

app.get('/login', checkIfAuthenticated, (req, res) => {
  res.render('login');
});

app.post("/login", (req, res) => {
  const { uname, psw } = req.body;

  User.findOne({ email: uname })
      .then((user) => {
          if (!user) {
              return res.status(404).send("User not found");
          }

          bcrypt.compare(psw, user.password).then((result) => {
              if (result) {
                  const token = jwt.sign({ id: user._id, email: user.email }, secretKey, { expiresIn: '1h' });

                  // Send the token as a cookie
                  res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // 1 hour expiration
                  return res.status(200).redirect("/dashboard");
              } else {
                  return res.status(400).send("Wrong password");
              }
          });
      })
      .catch((err) => {
          console.error("Error during login:", err);
          return res.status(500).send("Internal server error");
      });
});

const userSchema = new Schema({
  email: String,
  password: String,
});

const guideSchema = new Schema({
  title: { type: String, required: true },
  tag: { type: String, required: true },
  sections: [
    {
      header: { type: String, required: false },
      description: { type: String, required: false },
      image: { type: String, required: false },
    },
  ],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Add this line
});

const User = mongoose.model("User", userSchema);
const Guides = mongoose.model("Guides", guideSchema);

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post("/signup", async (req, res) => {
  console.log("signer opp her", req.body);
  const { uname, psw, psw2 } = req.body;

  if (psw === psw2) {
    try {
      const hash = await bcrypt.hash(psw, saltRounds);
      const newUser = new User({ email: uname, password: hash });
      const result = await newUser.save();

      // Create a token for the new user
      const token = jwt.sign({ id: result._id, email: result.email }, secretKey, { expiresIn: '1h' });

      // Send the token as a cookie
      res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // 1 hour expiration
      
      return res.status(200).redirect("/dashboard"); // Redirect to dashboard after signup
    } catch (error) {
      console.error("Error saving user:", error);
      return res.status(500).send("Internal server error");
    }
  } else {
    return res.status(400).send("Passwords do not match"); // Plain text response for mismatched passwords
  }
});

app.get("/guide", (req, res) => {
  res.render("guide");
});

app.get("/guide/:id", async (req, res) => {
  try {
    const guideId = req.params.id;
    const guide = await Guides.findById(guideId); // Fetch the guide from the database

    if (!guide) {
      return res.status(404).send("Guide not found");
    }

    res.render("guide", { guide }); // Pass the guide object to the template
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

app.get("/dashboard", verifyToken, async (req, res) => {
  try {
      const userId = req.user.id; // Extract user ID from the verified token
      const guides = await Guides.find({ userId }) || []; // Always initialize guides as an empty array
      console.log("Fetched guides:", guides); // Debugging output
      res.render("dashboard", { user: req.user, guides }); // Pass guides to EJS
  } catch (error) {
      console.error("Error fetching guides:", error);
      res.status(500).send("Internal server error");
  }
});

app.get("/newGuide", (req, res) => {
  res.render("newGuide");
});

// app.post("/newGuide", uploads.any(), async (req, res) => {
//   console.log(req.body, "BODY");
//   console.log(req.files, "FILES");

//   // Process each section data
//   const sections = req.body.header.map((header, index) => ({
//     header,
//     description: req.body.description ? req.body.description[index] : null, // Optional description
//     image: req.files.find((file) => file.fieldname === `image[${index}]`)
//       ? req.files.find((file) => file.fieldname === `image[${index}]`).filename
//       : null, // Optional image
//   }));

//   const newGuide = new Guides({
//     title: req.body.title,
//     tag: req.body.tag,
//     sections,
//   });

//   try {
//     const result = await newGuide.save();
//     // res.status(201).send({ message: "Guide created successfully", data: result });
//     res.redirect("/");
//   } catch (error) {
//     console.error("Error saving guide:", error);
//     res.status(500).send("Internal server error");
//   }
// });

app.post("/newGuide", uploads.any(), async (req, res) => {
  const userId = req.user.id; // Get the user ID from the request object
  console.log(req.body, "BODY");
  console.log(req.files, "FILES");

  // Process each section data
  const sections = req.body.header.map((header, index) => ({
    header,
    description: req.body.description ? req.body.description[index] : null,
    image: req.files.find((file) => file.fieldname === `image[${index}]`)
      ? req.files.find((file) => file.fieldname === `image[${index}]`).filename
      : null,
  }));

  const newGuide = new Guides({
    title: req.body.title,
    tag: req.body.tag,
    sections,
    userId: req.user.id
  });

  try {
    const result = await newGuide.save();
    res.redirect("/dashboard"); // Redirect to dashboard after creating a guide
  } catch (error) {
    console.error("Error saving guide:", error);
    res.status(500).send("Internal server error");
  }
});

app.listen(process.env.PORT);
