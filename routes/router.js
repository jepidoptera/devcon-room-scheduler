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

router.get('/amphitheater', (req, res) => {
    console.log('retrieving sheduler page...');
    let talks = airTable.getFromRoom("Amphitheater");
    res.render("scheduler", {
        title: "Amphitheater Lightning Talks",
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
        time_increment: 5,
        max_consecutive_slots: 2
    });
})

// router.get('/amphitheater', (req, res) => {
//     console.log('retrieving talks for amphitheater...');
//     let talks = airTable.getFromRoom("Amphitheater");
//     res.render("amphitheater", {talks: talks.map(talk => {
//         // let start = new Date(talk.start_at);
//         // let end = new Date(talk.end_at);

//         return {
//             ...talk,
//             // converting to UTC so javascript won't fuck with it
//             // sorry this looks horrible. timezones are annoying
//             // start_at: `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2,"0")}-${start.getDate().toString().padStart(2,"0")}T${start.getHours().toString().padStart(2,"0")}:${start.getMinutes().toString().padStart(2,"0")}Z`,
//             // end_at: `${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2,"0")}-${end.getDate().toString().padStart(2,"0")}T${end.getHours().toString().padStart(2,"0")}:${end.getMinutes().toString().padStart(2,"0")}Z`,
//             speakers: talk.speakers.map(speaker => {return {name: speaker}})
//         }
//     })});
// })

router.post('/reserve/amphitheater', (req, res) => {
    // console.log(JSON.stringify(req.body));
    airTable.schedule({
        ...req.body,
        // turn them into correct data types
        start_at: new Date(parseInt(req.body.start_at)).toISOString(),
        end_at: new Date(parseInt(req.body.start_at) + parseInt(req.body.length) * 60000).toISOString(),
        speakers: req.body.speakers.split(',').map(speaker => speaker.trim().toLowerCase()),
        room: "Amphitheater"
    });

    // TODO: send confirmation email (purpose TBD)
    let email = req.body.email;

    res.render("success", {text: "Thank you for your submission.  You'll receive a confirmation email shortly.", redirect: "/amphitheater"})
})

router.get("/meetings", (req, res) => {
    let meetings = airTable.getFromRoom("Meeting Room 1")
        .concat(airTable.getFromRoom("Meeting Room 2"));
        console.log(meetings);
        res.render("scheduler", {
            title: "Meeting Rooms",
            bookings: meetings.map(meeting => {return {...meeting, name: "occupied"}}),
            first_day: "10-08",
            last_day: "10-11",
            first_talk: "08:30",
            last_talk: "18:00",
            headings: [
                {name:"status", width: 50},
                {name:"time", width: 50},
            ],
            time_increment: 30,
            max_consecutive_slots: 2
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