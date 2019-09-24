const mongoose = require("mongoose");
const db = require("../models");

// This file empties the Books collection and inserts the books below

mongoose.connect(
    process.env.MONGODB_URI ||
    "mongodb://localhost/roomtimes",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const timeSeed = [];

const days = [
    new Date(Date.UTC(2019, 9, 8)),
    new Date(Date.UTC(2019, 9, 9)),
    new Date(Date.UTC(2019, 9, 10)),
    new Date(Date.UTC(2019, 9, 11))
]
let n = 0;
days.forEach(day => {
    for (let hours = 8.5; hours < 18; hours += .5) {
        let startTime = new Date(day);
        startTime.setUTCHours(Math.floor(hours));
        startTime.setUTCMinutes((hours % 1) * 60);
        let endTime = new Date(startTime);
        endTime.setUTCMinutes(startTime.getUTCMinutes() + 30);
        timeSeed.push({
            index: n++, 
            start: startTime, 
            end: endTime, 
            owner: "", 
            description: ""
        });
    }    
})

db.TimeSlot
  .deleteMany({})
  .then(() => db.TimeSlot.collection.insertMany(timeSeed))
  .then(data => {
    console.log(data.result.n + " records inserted!");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });