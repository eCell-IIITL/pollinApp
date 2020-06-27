const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var cookieParser = require("cookie-parser");
const fs=require("file-system");
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/views"));
app.use(cookieParser());
app.use(function(req,res,next){
  var date=Date(Date.now()).toString();
  console.log(date.slice(8,25), req.method, req.originalUrl);
  // if(req.originalUrl=="/shop"&&req.method=="POST"){
  //     console.log(res.body.returnedData);
  // }
  fs.appendFile('./log/logs.txt',
  date + ` ${req.method} ${req.originalUrl} \n`
  , function(err) {
      if(!err){
          next();
      }
      else console.log(err);
  });
});
mongoose.connect("mongodb://localhost:27017/polling");
var TeamSchema = new mongoose.Schema({
  Name: {
    type: String,
    unique: true,
    required:true
  },
  Members: [{ type: String }],
  votes: {
    type: Number,
    default: 0
  }
});
var Team = mongoose.model("Team", TeamSchema);

app.get("/", (req, res) => {
  var access="";
  console.log(req.cookies);
  if (req.cookies.visited != "true") {
    res.cookie("visited", "true", {expires: new Date(Date.now() + 999 * 3600000)}); //cookie expires in 48 hours
  }
  if(req.cookies.registered == "true")access="registered";
  res.render("landing.ejs",{access:access});
});
app.get("/dashboard",(req,res)=>{
  Team.find().sort({votes:-1}).exec((err,returnedData)=>{
    if(err){
      console.log(err);
    }else{
      // console.log(returnedData);
      res.render("dashboard.ejs",{teams:returnedData});               
    }
  })
  // res.send("Not Allowed");
});

app.all("/*", function(req, res, next) {
    if(req.path=="/clear")return next();
    else if (req.cookies.voted == "true") {
        return res.render("alreadyVoted.ejs");
    }else if (req.cookies.registered == "true" && req.path!="/vote") {
        return res.redirect("/vote");
    }else {
        next();
    }
});

app.get("/clear",(req,res)=>{                                       //all types of cookies
    res.clearCookie("voted");
    res.clearCookie("registered");
    res.clearCookie("visited");
    res.clearCookie("teamid");
    res.send("clearedall");
});

// app.get("/findTeams",(req,res)=>{
//   Team.find().exec((err,returnedData)=>{
//     if(err){
//       console.log(err);
//     }else{
//       res.json(returnedData);
//     }
//   })
// });
app.get("/join",(req,res)=>{
  Team.find().exec(function(err,returnedData){
    if(err){
      console.log(err);
    }else{
      res.render("joinTeam.ejs",{teams:returnedData})
    }
  })
});
app.post("/join",(req,res)=>{
  res.cookie("registered", "true",{expires: new Date(Date.now() +  999* 3600000)});
  res.cookie("teamid", req.body.id, {expires: new Date(Date.now() + 999 * 3600000)});
  console.log(req.body.id);
  findTeamsExcept(req.body.id,res);
});

// app.get("/register", (req, res) => {
//   res.render("register.ejs");
// });

// app.post("/register", (req, res) => {
//   var newTeam = {
//     Name: req.body.teamName,
//     Members: [
//       req.body.member1,
//       req.body.member2,
//       req.body.member3,
//       req.body.member4
//     ]
//   };
//   // console.log(newTeam);
//   Team.create(newTeam, (err, returnedData) => {
//     if (err) {
//       console.log(err);
//       res.send("Name is required and it has tobe unique");
//     } else {
//       console.log("Team Created:", returnedData);
//       res.cookie("teamid", returnedData._id, {expires: new Date(Date.now() + 999 * 3600000)});
//       res.cookie("registered", "true", {expires: new Date(Date.now() + 999 * 3600000)});
//       res.redirect("/vote");
//     }
//   });
// });

app.get("/vote", (req, res) => {
  //   console.log("came here!");
  //   res.send("okay");
  var id = req.cookies.teamid;
  findTeamsExcept(id, res);
});

app.post("/vote", (req, res) => {
  var id = req.body.id;
  Team.findOneAndUpdate(
    { _id: id },
    { $inc: { votes: 1 } },
    { new: true }
  ).exec((err, returnedData) => {
    if (err) {
      console.log(err);
    } else {
      res.cookie("voted", "true", {expires: new Date(Date.now() + 999 * 3600000)});
      console.log(returnedData);
      res.render("voted.ejs");
    }
  });
});

app.listen(3000, function() {
  console.log("Listening at 3000");
});

function findTeamsExcept(id, res) {                                  // To find all the teams from Db except for the given id
  Team.find({ _id: { $ne: id } }).exec((err, teams) => {
    if (err) {
      console.log(err);
    } else {
      res.render("vote.ejs", { teams: teams });
    }
  });
}
