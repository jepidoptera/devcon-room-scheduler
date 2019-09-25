const express =  require("express");
const mongoose = require('mongoose');

const db = require("../models");
const airTable = require('../scripts/airtableAPI');

const router = express.Router();

mongoose.connect(
process.env.MONGODB_URI ||
"mongodb://localhost/roomtimes",
{
    useNewUrlParser: true,
    useUnifiedTopology: true
}
);

router.get('/', (req, res) => {
    // home page
    console.log('rendering timetable page...');
    db.TimeSlot
        .find({})
        .sort({ index: 1 })
        .then(timeslots => {
            timeslots = timeslots.map(slot => {
                return {
                start: timeFormat(slot.start),
                index: slot.index,
                // we won't show the name of the owner at all, just raise a flag if there is one
                owner: slot.owner ? true : false             
                }
            });
            // console.log(timeslots);
            res.render("index", {
                timeslots: timeslots
            })
        })
        .catch(err => res.status(422).json(err));
})

router.get('/signup/:index', (req, res) => {
    console.log(req);
    res.render('signup', {index: req.params.index})
})

router.post('/signup/:index', (req, res) => {
    console.log(req.body);
    db.TimeSlot
    .findOneAndUpdate({ index: req.params.index }, req.body)
    .then(dbModel => {
        console.log(JSON.stringify(dbModel));
        res.render("success", {text: "submitted successfully - redirecting...", redirect: "/"});
    })
    .catch(err => res.status(422).json(err));
})

router.get("/admin", (req, res) => {
    db.TimeSlot
        .find({})
        .sort({ index: 1 })
        .then(timeslots => {
            timeslots = timeslots.map(slot => {
                return {
                    index: slot.index,
                    start: timeFormat(slot.start),
                    owner: slot.owner,
                    description: slot.description
                }
            });
            // console.log(timeslots);
            res.render("admin", {
                timeslots: timeslots
            })
        })
        .catch(err => res.status(422).json(err));
})

router.get("/admin/login", (req, res) => {
    // we will make this very easy for now
    res.render("login", {});
})

router.post("/admin/login", (req, res) => {
    // we will make this very easy for now
    res.render("success", {text: "that password definitely checks out!", redirect: "/admin"});
})

router.get("/admin/edit/:index", (req, res) => {
    db.TimeSlot
        .findOne({index: req.params.index})
        .then(slot => {
            console.log("admin editing slot: ", slot);
            res.render("edit", slot);
        })
        .catch(err => res.status(422).json(err))
})

router.post('/admin/edit/:index', (req, res) => {
    console.log(req.body);
    db.TimeSlot
    .findOneAndUpdate({ index: req.params.index }, req.body)
    .then(dbModel => {
        console.log(JSON.stringify(dbModel));
        res.render("success", {text: "updated successfully - redirecting...", redirect: "/admin"});
    })
    .catch(err => res.status(422).json(err));
})

router.get('/admin/talks', (req, res) => {
    console.log('retrieving talks...');
    airTable.getTalks((talks) => {
        res.render("talks", {talks: talks.map(talk => {
            let start = new Date(talk.start_at);
            let end = new Date(talk.end_at);
            return {
                ...talk,
                time:  `${daysOfWeek[start.getDay()]}, 
                ${start.getHours()}:${start.getMinutes().toString().padEnd(2, "0")} -
                ${end.getHours()}:${end.getMinutes().toString().padEnd(2, "0")}`        
            }
        })});
    });
})

// router.get("/reset", (req, res) => {
//     // reset database
//     require("../scripts/seedDB");
//     res.send("reset complete ;)");
// })

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeFormat(date) {
    return daysOfWeek[date.getDay()] 
    + ", " + date.getUTCHours()  + ":" 
    + date.getUTCMinutes().toString().padEnd(2, "0")
}

module.exports = router;