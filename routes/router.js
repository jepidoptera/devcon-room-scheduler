const express =  require("express");
const mongoose = require('mongoose');

const db = require("../models");
const airTable = require('../scripts/airtableAPI');
const email = require('../scripts/sendgridAPI')

const router = express.Router();

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
router.get("/", (req, res) => {
    res.redirect('/amphitheater');
})

router.get('/amphitheater', (req, res) => {
    console.log('retrieving scheduler page...');
    let talks = airTable.getFromRoom("Amphitheater");
    res.header("Cache-control", "no-store");
    res.render("scheduler", {
        title: "Lightning Talks",
        rooms: ["Amphitheater"],
        bookings: talks.map(talk => {

            return {
                ...talk,
                speakers: talk.speakers.map(speaker => {return {name: speaker}})
            }
        }),
        first_day: "10-08",
        last_day: "10-11",
        first_talk: "09:00",
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
        time_increment: 30,
        max_consecutive_slots: 0
    });
})

router.get("/meeting", (req, res) => {
    let meetings = airTable.getFromRoom("Meeting Room 1")
        .concat(airTable.getFromRoom("Meeting Room 2"));
        // console.log(meetings);
        res.header("Cache-control", "no-store");
        res.render("scheduler", {
            title: "Meetings",
            rooms: ["Meeting Room 1", "Meeting Room 2"],
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
            max_table_width: "1200px",
            fields: [
                {text:"group name:", name: "name", required: true}
            ],
            time_increment: 30,
            max_consecutive_slots: 2
        });
})

router.post('/reserve', (req, res) => {
    console.log(JSON.stringify(req.body));
    let timeStart = new Date(parseInt(req.body.start_at));
    let timeEnd = new Date(parseInt(req.body.start_at) + parseInt(req.body.length) * 60000);
    airTable.schedule({
        ...req.body,
        // turn them into correct data types
        start_at: timeStart.toISOString(),
        end_at: timeEnd.toISOString(),
        speakers: req.body.speakers 
            ? req.body.speakers.split(',').map(speaker => speaker.trim().toLowerCase())
            : undefined,
    }, function (response) {
        if (response.error) {
            res.render("serverMessage", {
                text: response.error
            })
            return;
        }

        // send confirmation email
        let date = daysOfWeek[timeStart.getUTCDay()] + timeStart.toGMTString().slice(3, -13);
        let timespan = `${timeStart.getUTCHours()}:${timeStart.getUTCMinutes().toString().padStart(2, "0")}-`
            + `${timeEnd.getUTCHours()}:${timeEnd.getUTCMinutes().toString().padStart(2, "0")}`;
        let message = {
            to: req.body.email,
            from: "noreply@devcon.org",
            subject: "scheduling confirmation",
            text: (req.body.room === "Amphitheater"
                ? `You’re all set! You’ve scheduled a lightning talk for ${date}, ${timespan}.  There will be others scheduled directly before and after yours, so please be on time and ready to go!`
                : `You’re all set! You’ve booked ${req.body.room} for ${date}, ${timespan}. There will be meetings directly before and after yours, so please be respectful of others’ time by arriving on time and vacating the room promptly when your time is up.`
            )
        }
        // console.log("emailing: ", message);
        email.send(message);

        // send one to devcon-rooms@ethereum.org so admin can see what's up
        email.send({
            to: "devcon-rooms@ethereum.org",
            from: "devcon_room_scheduler@devcon.org",
            subject: "new schedule confirmation",
            html: `email: ${req.body.email} <br>
        ticket#: ${req.body.ticket} <br> 
        room:${req.body.room} <br> 
        date: ${date} <br> 
        timespan: ${timespan} <br>
        ${req.body.name ? "name: " + req.body.name + "<br>" : ""} 
        ${req.body.description ? "description: " + req.body.description + "<br>" : ""}
        ${req.body.speakers ? "speakers: " + req.body.speakers + "<br>" : ""}`
        })

        res.render("serverMessage", {
            text: "Thank you for your submission.  You'll receive a confirmation email shortly.",
            timeout: 1000,
            redirect: `/${req.body.room.split(' ')[0].toLowerCase()}`
        })
    })
})
    
router.get("/api/hash/:room", (req, res) => {
    let hash = airTable.getHash(req.params.room);
    // console.log ('returning hash code: ', hash);
    res.json({hash: hash});
})

// router.get("/reset", (req, res) => {
//     // reset database
//     require("../scripts/seedDB");
//     res.send("reset complete ;)");
// })


function timeFormat(date) {
    return daysOfWeek[date.getDay()] 
    + ", " + date.getUTCHours()  + ":" 
    + date.getUTCMinutes().toString().padEnd(2, "0")
}

module.exports = router;