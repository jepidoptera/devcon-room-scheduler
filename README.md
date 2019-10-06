# devcon-room-scheduler
A web app for flexible scheduling.

Routes/router.js manages routes.  Each endpoint, such as /amphitheater, renders the same page but passes it a different object.  The object looks like so:
```
{
        title: "Lightning Talks",
        rooms: ["Amphitheater"],
        bookings: airTable.getFromRoom("Amphitheater"),
        first_day: "10-08", // first day of the conference
        last_day: "10-11",
        first_talk: "09:00", // first talk of the day
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
}
```
The page then constructs a table listing all the events in each room on each day, with buttons to navigate between rooms/days, and buttons to schedule any time slots which are open.

I built this with Jquery/Handlebars.  I'll admit that React might have been a better choice, but ¯\_(ツ)_/¯
