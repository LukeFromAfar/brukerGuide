const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");


const Schema = mongoose.Schema;

const diskStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./uploads")
    },
    filename: function(req, file, cb){
        const ext = path.extname(file.originalname);
        console.log("EXT", ext);

        // if(ext !== ".png") {
        //     return cb(new Error ("Only PNG files allowed"))
        // }
        const fileName = file.originalname + ".png";
        cb(null, fileName)
    }
});

const uploads = multer(
    storage = diskStorage
);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userGuide")
    .then(() => console.log("connected!"))
    .catch((error) => console.log("error", error));


const saltRounds = 10;

app.get("/", (req, res) => {
    res.render("index")
});

app.get("/login", (req, res) => {
    res.render("login")
});

app.post("/login", (req, res) => {
    console.log("logger ut her", req.body);
    const {uname, psw} = req.body;

    User.findOne({email: uname})
        .then((user) => {
            console.log("result", user);

            bcrypt.compare(psw, user.password).then((result) => {
                res.status(200).redirect("/dashboard")
            }).catch((error) => {
                console.log("error", error);
            })
        })

    console.log(uname);

})

app.get("/signup", (req, res) => {
    res.render("signup")
})

const userSchema = new Schema({
    email: String,
    password: String
})

const guideSchema = new Schema ({
    title: String,
    tag: String,
    header: Array, 
    description: Array,    
    image: Array,
})

const User = mongoose.model("User", userSchema);
const Guides = mongoose.model("Guides", guideSchema);
app.post("/signup", async (req, res) => {
    console.log("signer opp her", req.body);
    const {uname, psw, psw2} = req.body;
    console.log(uname, psw, psw2, psw == psw2);

    if(psw == psw2){

        bcrypt.hash(psw, saltRounds, async function(error, hash) {
            const newUser = new User({email: uname, password: hash});
        
            const result = await newUser.save();
            console.log(result);
            if(result._id){
                res.redirect("/dashboard")
            }
        })

    } else {
        res.status(500).json({message: "Passord stemmer ikke overens"})
    }

})

app.get("/guide", (req, res) => {
    res.render("guide")
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard")
});

app.get("/newGuide", (req, res) => {
    res.render("newGuide");
});

app.post("/newGuide", uploads.array("image"), async (req, res) => {
    console.log(req.body, "BODY")
    console.log(req.files, "FILE")

    const newGuides = new Guides({ 
        title: req.body.title, 
        tag: req.body.tag,
         header: req.body.header, 
         description: req.body.description })
    const result = await newGuides.save();
});

app.listen(process.env.PORT);

