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

router.get('/oldhome', (req, res) => {
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

router.get('/amphitheater', (req, res) => {
    console.log('retrieving sheduler page...');
    let talks = airTable.getFromRoom("Amphitheater");
    res.render("scheduler", {
        title: "Amphitheater Lightning Talks",
        rooms: ["amphitheater"],
        bookings: talks.map(talk => {

            return {
                ...talk,
                speakers: talk.speakers.map(speaker => {return {name: speaker}})
            }
        }),
        first_day: "10-08",
        last_day: "10-11",
        first_talk: "10:00",
        last_talk: "17:00",
        headings: [
            {name:"name", width: 20},
            {name:"time", width: 20},
            {name:"description", width: 40},
            {name:"speakers", width: 20}
        ],
        fields: [
            {text:"talk name", name: "name", required: true},
            {text:"description", name: "description"},
            {text: "speaker(s): (separate names with commas)", name: "speakers", required: true}
        ],
        time_increment: 5,
        max_consecutive_slots: 2
    });
})

router.get("/meeting", (req, res) => {
    let meetings = airTable.getFromRoom("Meeting Room 1")
        .concat(airTable.getFromRoom("Meeting Room 2"));
        // console.log(meetings);
        res.render("scheduler", {
            title: "Meeting Rooms",
            rooms: ["meeting room 1", "meeting room 2"],
            // obscure the actual names of the groups
            bookings: meetings.map(meeting => {return {...meeting, name: "occupied"}}),
            first_day: "10-08",
            last_day: "10-11",
            first_talk: "08:30",
            last_talk: "18:00",
            headings: [
                {name:"status", width: 50},
                {name:"time", width: 50},
            ],
            fields: [
                {text:"group name:", name: "name", required: true}
            ],
            time_increment: 30,
            max_consecutive_slots: 2
        });
    })

    router.post('/reserve', (req, res) => {
        // console.log(JSON.stringify(req.body));
        airTable.schedule({
            ...req.body,
            // turn them into correct data types
            start_at: new Date(parseInt(req.body.start_at)).toISOString(),
            end_at: new Date(parseInt(req.body.start_at) + parseInt(req.body.length) * 60000).toISOString(),
            speakers: req.body.speakers 
                ? req.body.speakers.split(',').map(speaker => speaker.trim().toLowerCase())
                : undefined,
        });
    
        // TODO: send confirmation email (purpose TBD)
        let email = req.body.email;
    
        res.render("success", {
            text: "Thank you for your submission.  You'll receive a confirmation email shortly.", 
            redirect: `/${req.body.room.split(' ')[0].toLowerCase()}`
        })
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