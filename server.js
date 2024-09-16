const express = require("express");
const app = express();
require("dotenv").config();


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.get("/", (req, res) => {
    res.render("index")
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/login", (req, res) => {
    console.log("logger ut her", req.body);
    const {uname, psw} = req.body;
    console.log(uname);
})

app.get("/signup", (req, res) => {
    res.render("signup")
})

app.post("/signup", (req, res) => {
    console.log("logger ut her", req.body);
    const {uname, psw} = req.body;
    console.log(uname);
})

app.get("/guide", (req, res) => {
    res.render("guide")
})

app.get("/dashboard", (req, res) => {
    res.render("dashboard")
})

app.listen(process.env.PORT);

