const mongoose = require("mongoose");

const timeslotSchema = new mongoose.Schema({
    index: { type: Number, required: true},
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    owner: { type: String, required: false },
    description: { type: String, required: false },
});

const Timeslot = mongoose.model("TimeSlot", timeslotSchema);

module.exports = Timeslot;