const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
app.use('/uploads', express.static('uploads'));

const Schema = mongoose.Schema;

// const diskStorage = multer.diskStorage({
//     destination: function(req, file, cb) {
//         cb(null, "./uploads")
//     },
//     filename: function(req, file, cb){
//         const ext = path.extname(file.originalname);
//         console.log("EXT", ext);

//         // if(ext !== ".png") {
//         //     return cb(new Error ("Only PNG files allowed"))
//         // }
//         const fileName = file.originalname + ".png";
//         cb(null, fileName)
//     }
// });

// const uploads = multer(
//     storage = diskStorage
// );

// const diskStorage = multer.diskStorage({
//     destination: function(req, file, cb) {
//         cb(null, "./uploads"); // Store files in the /uploads directory
//     },
//     filename: function(req, file, cb) {
//         const ext = path.extname(file.originalname);
//         console.log("EXT", ext);

//         // Construct file name
//         const fileName = `${Date.now()}-${file.originalname}`;
//         cb(null, fileName);
//     }
// });

const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify the upload folder
    },
    filename: function (req, file, cb) {
        // Declare and get the file extension
        const ext = path.extname(file.originalname);
        console.log("EXT", ext);

        // Generate a unique filename using a timestamp and the original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const uploads = multer({ 
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File type not supported'));
    }

 });

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userGuide")
    .then(() => console.log("connected!"))
    .catch((error) => console.log("error", error));


const saltRounds = 10;

// app.get("/", (req, res) => {
//     res.render("index")
// });

app.get("/", async (req, res) => {
    try {
        const guides = await Guides.find(); // Fetch all guides from the database
        res.render("index", { guides }); // Pass the guides to the index view
    } catch (error) {
        console.error("Error fetching guides:", error);
        res.status(500).send("Internal server error");
    }
});

app.get("/login", (req, res) => {
    res.render("login")
});

// app.post("/login", (req, res) => {
//     console.log("logger inn her", req.body);
//     const {uname, psw} = req.body;

//     User.findOne({email: uname})
//         .then((user) => {
//             console.log("result", user);

//             bcrypt.compare(psw, user.password).then((result) => {
//                 if (result) {
//                   return res.status(200).redirect("/dashboard");
//                 } else {
//                   return res.status(400).json({ error: "wrong password" });
//                 }
//             });
            
//         }).catch((user))

//     console.log(uname);

// })

app.post("/login", (req, res) => {
    console.log("logger inn her", req.body);
    const { uname, psw } = req.body;

    User.findOne({ email: uname })
        .then((user) => {
            console.log("result", user);

            if (!user) {
                // User not found
                return res.status(404).send("User not found");
            }

            bcrypt.compare(psw, user.password).then((result) => {
                if (result) {
                    return res.status(200).redirect("/dashboard");
                } else {
                    return res.status(400).send("Wrong password");
                }
            });
        })
        .catch((err) => {
            console.error("Error occurred during login:", err);
            return res.status(500).send("Internal server error");
        });
});

app.get("/signup", (req, res) => {
    res.render("signup")
})

const userSchema = new Schema({
    email: String,
    password: String
})

const guideSchema = new Schema({
    title: { type: String, required: true },
    tag: { type: String, required: true },
    sections: [
        {
            header: { type: String, required: true },
            description: { type: String, required: false },
            image: { type: String, required: false }
        }
    ]
});

const User = mongoose.model("User", userSchema);
const Guides = mongoose.model("Guides", guideSchema);

app.post("/signup", async (req, res) => {
    console.log("signer opp her", req.body);
    const { uname, psw, psw2 } = req.body;
    console.log(uname, psw, psw2, psw === psw2);

    if (psw === psw2) {
        try {
            const hash = await bcrypt.hash(psw, saltRounds);
            const newUser = new User({ email: uname, password: hash });
            const result = await newUser.save();
            console.log(result);
            if (result._id) {
                return res.status(200).send("Sign-up successful"); 
            }
        } catch (error) {
            console.error("Error saving user:", error);
            return res.status(500).send("Internal server error"); 
        }
    } else {
        return res.status(400).send("Passwords do not match"); // Plain text response for mismatched passwords
    }
});

app.get("/guide", (req, res) => {
    res.render("guide")
});

app.get('/guide/:id', async (req, res) => {
    try {
        const guideId = req.params.id;
        const guide = await Guides.findById(guideId); // Fetch the guide from the database

        if (!guide) {
            return res.status(404).send('Guide not found');
        }

        res.render('guide', { guide }); // Pass the guide object to the template
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard")
});

app.get("/newGuide", (req, res) => {
    res.render("newGuide");
});


// app.post('/newGuide', uploads.any(), async (req, res) => {
//     console.log(req.body, "BODY");
//     console.log(req.files, "FILES");

//     // Process each section data
//     const sections = req.body.header.map((header, index) => ({
//         header,
//         description: req.body.description[index],
//         image: req.files[index] ? req.files[index].filename : null // Match files to the index
//     }));

//     const newGuide = new Guides({
//         title: req.body.title,
//         tag: req.body.tag,
//         sections
//     });

//     try {
//         const result = await newGuide.save();
//         res.status(201).send({ message: "Guide created successfully", data: result });
//     } catch (error) {
//         console.error("Error saving guide:", error);
//         res.status(500).send("Internal server error");
//     }
// });

// app.post('/newGuide', uploads.fields([
//     { name: 'header' },
//     { name: 'description' },
//     { name: 'image' } 
// ]), (req, res) => {
//     console.log(req.body, "BODY");
//     console.log(req.files, "FILES");

//     // Process each section data
//     const sections = req.body.header.map((header, index) => ({
//         header,
//         description: req.body.description ? req.body.description[index] : null, // Optional description
//         image: req.files['image'] ? req.files['image'][index] ? req.files['image'][index].filename : null : null // Optional image
//     }));

//     const newGuide = new Guides({
//         title: req.body.title,
//         tag: req.body.tag,
//         sections
//     });

//     newGuide.save()
//         .then(result => res.status(201).send({ message: "Guide created successfully", data: result }))
//         .catch(err => res.status(500).send("Internal server error"));
// });

app.post('/newGuide', uploads.any(), async (req, res) => {
    console.log(req.body, "BODY");
    console.log(req.files, "FILES");

    // Process each section data
    const sections = req.body.header.map((header, index) => ({
        header,
        description: req.body.description ? req.body.description[index] : null, // Optional description
        image: req.files.find(file => file.fieldname === `image[${index}]`) ? req.files.find(file => file.fieldname === `image[${index}]`).filename : null // Optional image
    }));

    const newGuide = new Guides({
        title: req.body.title,
        tag: req.body.tag,
        sections
    });

    try {
        const result = await newGuide.save();
        // res.status(201).send({ message: "Guide created successfully", data: result });
        res.redirect("/");
    } catch (error) {
        console.error("Error saving guide:", error);
        res.status(500).send("Internal server error");
    }
});

app.listen(process.env.PORT);
