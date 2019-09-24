const express =  require("express");
const mongoose = require('mongoose');
const db = require("../models");
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
        res.render("success", {});
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
                    start: timeFormat(slot.start),
                    index: slot.index,
                    owner: slot.owner,
                    description: description
                }
            });
            // console.log(timeslots);
            res.render("admin", {
                timeslots: timeslots
            })
        })
        .catch(err => res.status(422).json(err));
})

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeFormat(date) {
    return daysOfWeek[date.getDay()] 
    + ", " + date.getUTCHours()  + ":" 
    + date.getUTCMinutes().toString().padEnd(2, "0")
}

module.exports = router;