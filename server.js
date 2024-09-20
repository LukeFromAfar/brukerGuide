const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const Schema = mongoose.Schema;


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userGuide")
    .then(() => console.log("connected!"))
    .catch((error) => console.log("error", error));


const saltRounds = 10;

const userSchema = new Schema({
    email: String,
    password: String
})

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("index")
})

app.get("/login", (req, res) => {
    res.render("login")
})

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

app.post("/signup", async (req, res) => {
    console.log("signer opp her", req.body);
    const {uname, psw, psw2} = req.body;
    console.log(uname);

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
})

app.get("/dashboard", (req, res) => {
    res.render("dashboard")
})

app.listen(process.env.PORT);

