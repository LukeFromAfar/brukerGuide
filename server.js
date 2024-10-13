const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;

const verifyToken = require("./functions/verifyToken.js")

app.use(cookieParser());

app.use("/uploads", express.static("uploads"));
const secretKey = process.env.JWT_SECRET_KEY;

const Schema = mongoose.Schema;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



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

app.use(verifyToken);

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
    const guides = await Guides.find();
    res.render("index", { guides }); // No need to pass `user` anymore
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
    const guide = await Guides.findById(guideId).populate('userId'); // Ensure userId is populated

    if (!guide) {
      return res.status(404).render('404', { message: 'Guide not found.', user: req.user });
    }

    // Render the guide and pass the user info
    res.render("guide", { guide, user: req.user });
  } catch (error) {
    console.error("Error fetching guide:", error);
    res.status(500).render('404', { message: 'Server error. Please try again later.', user: req.user });
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

app.post("/newGuide", verifyToken, upload.any(), async (req, res) => {
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
    userId: userId,  // Save the user's ID from req.user
  });

  try {
    const result = await newGuide.save();
    res.redirect("/dashboard"); // Redirect to dashboard after creating a guide
  } catch (error) {
    console.error("Error saving guide:", error);
    res.status(500).send("Internal server error");
  }
});

app.get('/guide/:id/edit', verifyToken, async (req, res) => {
  const guideId = req.params.id;
  const userId = req.user._id; // Get the logged-in user's ID

  try {
      const guide = await Guides.findById(guideId).populate('userId'); // Populate userId to access creator info

      if (!guide) {
          return res.status(404).send('Guide not found');
      }

      // Check if the logged-in user is the creator of the guide
      if (!guide.userId.equals(userId)) {
          // return res.status(403).send('You do not have permission to edit this guide');
          console.log(297, guide.userId, userId);
          
      }

      res.render('editGuide', { guide });
  } catch (error) {
      console.error("Error fetching guide for editing:", error);
      res.status(500).send('Server error');
  }
});

app.post('/guide/:id/edit', upload.any(), async (req, res) => {
  const guideId = req.params.id;
  const { title, tag, header, description, existingImage } = req.body;
  const uploadedFiles = req.files || [];

  try {
    const guide = await Guides.findById(guideId);
    if (!guide) {
      return res.status(404).send("Guide not found");
    }

    // Store old image filenames for later comparison
    const oldImages = guide.sections.map(section => section.image).filter(Boolean);

    // Update guide's title and tag
    guide.title = title;
    guide.tag = tag;

    // Update sections
    guide.sections = header.map((headerText, index) => {
      let imageFilename = existingImage ? existingImage[index] || '' : '';

      // Check if a new image was uploaded for this section
      const newImage = uploadedFiles.find(file => file.fieldname === `image[${index}]`);
      if (newImage) {
        imageFilename = newImage.filename; // Set new image filename if uploaded
      }

      return {
        header: headerText,
        description: description[index],
        image: imageFilename // Either keep the existing image or use the new one
      };
    });

    // Get the new set of image filenames
    const newImages = guide.sections.map(section => section.image).filter(Boolean);

    // Find images that are no longer used
    const imagesToDelete = oldImages.filter(img => !newImages.includes(img));

    // Delete unused images
    for (const img of imagesToDelete) {
      const imgPath = path.join(__dirname, 'uploads', img);
      try {
        await fs.unlink(imgPath); // Remove the old file from /uploads
        console.log(`Deleted unused image: ${img}`);
      } catch (err) {
        console.error(`Failed to delete image ${img}:`, err);
      }
    }

    // Save updated guide
    await guide.save();

    res.redirect(`/guide/${guideId}`);
  } catch (error) {
    console.error("Error updating guide:", error);
    res.status(500).send("Error updating guide");
  }
});

app.delete("/guide/:id", verifyToken, async (req, res) => {
  const guideId = req.params.id;

  try {
      // Find the guide to get its associated images
      const guide = await Guides.findById(guideId);

      if (!guide) {
          return res.status(404).json({ message: "Guide not found" });
      }

      // Loop through the sections and delete images
      guide.sections.forEach(section => {
          if (section.image) {
              const imagePath = path.join(__dirname, 'uploads', section.image);
              fs.unlink(imagePath, (err) => {
                  if (err) {
                      console.error(`Failed to delete image: ${imagePath}`, err);
                  } else {
                      console.log(`Successfully deleted image: ${imagePath}`);
                  }
              });
          }
      });

      // Delete the guide from the database
      await Guides.findByIdAndDelete(guideId);
      res.status(200).json({ message: "Guide deleted successfully" });
  } catch (error) {
      console.error("Error deleting guide:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("token"); // Clear the token cookie
  res.redirect("/"); // Redirect to home or login page

});

app.use((req, res) => {
  res.status(404).render('404', { message: 'Page not found.' });
});

app.listen(process.env.PORT);