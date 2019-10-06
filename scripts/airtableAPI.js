const Airtable = require('airtable');
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE);
const base2 = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE_2);

let rooms_cache = {
    add: (record) => {
        rooms_cache[record.id] = {name: record.get("Name")};
        rooms_cache[record.get("Name")] = {id: record.id};
    }
};
let speakers_cache = {add: (record) => {
    speakers_cache[record.id] = {
        name: record.get("Name"),
        title: record.get("Title (english)"),
        affiliation: record.get("Affiliation"),
        bio: record.get("Bio (english)"),
    };
    // cross-reference
    if (record.get("Name")) speakers_cache[record.get("Name").toLowerCase()] = {id: record.id};
}};
let talks_cache = [];

function getRooms(callback) {
    base('Rooms').select({})
    .eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.

        // console.log(JSON.stringify(records));

        records.forEach(function(record) {
            // cross-reference these things
            rooms_cache.add(record);
        });
    
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();
    
    }, function done(err) {
        console.log("********************* loaded rooms *********************");
        if (err) { console.error(err); return; }
        if (callback) callback(rooms_cache);
    });    
}

function getSpeakers(callback) {
    // re-load speakers
    console.log('loading speakers');
    base('Speakers').select({})
    .eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.

        // console.log(JSON.stringify(records));

        records.forEach(function(record) {
            // console.log("*****");
            // console.log(JSON.stringify(record));
            speakers_cache.add(record);
        });
    
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();
    
    }, function done(err) {
        console.log("******************** loaded speakers *******************");
        // console.log(speakers_cache);
        if (err) { console.error(err); return; }
        if (callback) callback(speakers_cache);
    });    
}

function getTalks (callback) {
    let pages = 1;
    let newTalks = [];
    console.log("loading talks");

    base('Talks').select({sort: [{field: "Start at", direction: "asc"}]})
    .eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.
        if (callback) console.log(`page ${pages++}...`);
    
        for (let n = 0; n < records.length; n++) {
            let record = records[n]
            // some "talks" are actually blank rows, so filter those out...
            if (record.get('Room')) {
                // if we don't have a record for any listed speaker, that is an indication that we need to re-load
                let speakerIDs = record.get('Speakers');
                if (speakerIDs) {
                    for (let i = 0; i < speakerIDs.length; i++ )
                    {
                        if (!speakers_cache[speakerIDs[i]]) {
                            // console.log("new speaker detected: ", speakerIDs[i], ". reloading...");
                            // re-load speakers and then call this function again
                            getSpeakers(() => getTalks(callback));
                            return;
                        }
                    }
                }
                newTalks.push({
                    name: record.get('Name (english)'), 
                    start_at: record.get('Start at'), 
                    end_at: record.get('End at'), 
                    description: record.get('Description (english)'), 
                    speakers: speakerIDs 
                        ? speakerIDs.map(id => speakers_cache[id].name)
                        : [], 
                    room: rooms_cache[record.get('Room')].name,
                    id: record.id
                });
            }
        }
    
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();
    
    }, function done(err) {
        if (callback) console.log('done.');
        talks_cache = newTalks;

        // get meetings too
        getMeetings(() => {
            if (err) { console.error(err); return; }
            console.log("********************* loaded talks *********************");
            if (callback) {
                callback(talks_cache);
            }
        })
    });    
}

function getMeetings(callback) {
    base2('Meetings').select({sort: [{field: "Start at", direction: "asc"}]})
    .eachPage(function page(records, fetchNextPage) {
    
        for (let n = 0; n < records.length; n++) {
            let record = records[n]
            // filter out any blank rows
            if (record.get('Room')) {
                let meeting = {
                    name: record.get('Group name'), 
                    start_at: record.get('Start at'), 
                    end_at: record.get('End at'), 
                    email: record.get('Email'),
                    room: record.get('Room'),
                    id: record.id
                }
                // console.log('found meeting: ', meeting)
                // just put it in the same array with "talks" for ease of use
                talks_cache.push(meeting);
            }
        }
    
        fetchNextPage();
    
    }, function done(err) {

        if (err) { console.error(err); return; }
        if (callback) {
            callback(talks_cache);
        }
    });    
}

// load caches
getRooms(() => getSpeakers(() => getTalks()));


// just keep updating in the background every ten seconds
setInterval(getTalks, 10000);

// export object
const API = {
    // get all talks occurring in a particular room
    getFromRoom: (roomName) => {
        let filterTalks = talks_cache.filter(talk => talk.room === roomName);
        // console.log(filterTalks);
        return filterTalks;
    },

    checkTimeConflicts: (start_at, end_at, room) => {
        startTime = new Date(start_at).getTime();
        endTime = new Date(end_at).getTime();
        // console.log ('checking schedule between: ', start_at, `(${startTime}) &`, end_at, `(${endTime})`)
        let conflict = [];
        talks_cache.forEach(talk => {
            if (talk.room === room) {
                if (!talk.startTime) talk.startTime = new Date(talk.start_at).getTime();
                if (!talk.endTime) talk.endTime = new Date(talk.end_at).getTime();
                if ((startTime >= talk.startTime && startTime < talk.endTime)
                    || (endTime > talk.startTime && endTime <= talk.endTime)
                    || (startTime < talk.startTime && endTime > talk.endTime)) {
                    // conflict
                        conflict.push(talk);
                }
                // console.log('checking against: ', talk);
            }
        })
        if (conflict.length > 0) {
            console.log(`${start_at} - ${end_at} conflicts with: `, conflict);
            return conflict;
        }
        else return null;
    },

    schedule: (deets, callback) => {
        console.log('scheduling: ', deets);
        // unpack those details
        let {name, start_at, end_at, email, description, speakers, room} = deets;

        // make sure there are no scheduling conflicts
        if (API.checkTimeConflicts(start_at, end_at, room)) {
            return { error: "Cannot schedule that time slot, as it conflicts with an existing schedule."};
        }

        // create entries for speakers if none exist
        let missingSpeakers = speakers ? speakers.filter(speaker => !speakers_cache[speaker]) : [];
        if (missingSpeakers.length > 0) {
            base('Speakers').create(
                missingSpeakers.map(speaker => {
                    return {
                        "fields": {
                            "Name": speaker,
                            "Title (english)": "lightning talk presenter"
                        }
                    }
                }), 
                function(err, records) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log("added speakers: ");
                    records.forEach(function (record) {
                        speakers_cache.add(record);
                        console.log(record.get("Name"));
                    });
                    API.schedule(deets, callback);
                }
            )
            // don't do anything until the speakers are added
            return;
        }
        let usingBase = base('Talks');
        let record = {};

        // console.log('room name: ', room, ', cache: ', rooms_cache);
        if (!["Meeting Room 1", "Meeting Room 2"].includes(room)) {
            record = {
                "fields": {
                    "Name (english)": name,
                    "Start at": start_at,
                    "End at": end_at,
                    "Room": [
                        rooms_cache[room].id
                    ],
                    "Description (english)": description,
                    "Speakers": speakers.map(speaker => speakers_cache[speaker].id)
                }
            }
        }
        // awkwardly use a different format (and base) for these two rooms
        else {
            usingBase = base2("Meetings");
            record = {
                "fields": {
                    "Group name": name,
                    "Start at": start_at,
                    "End at": end_at,
                    "Room": room,
                    "Email": email,
                }
            }
        }
        usingBase.create([ record ], function(err, records) {
            if (err) {
                console.error(err);
            }
            // let it show up immediately
            records.forEach(function (record) {
                talks_cache.push({...deets, id: record.id});
                console.log('added talk:', record.get('Name (english)'));
            });
            if (callback) callback({records: records, error: err});
        })
        return {};
    },
    getHash: (roomName) => {
        // console.log('getting hash for: ');
        // get some kind of hash code, good enough to see if anything has changed
        let relevant_rooms = API.getFromRoom(roomName);
        // console.log(relevant_rooms);
        hash = "#" + relevant_rooms.reduce((hash, talk) => {return hash + talk.id}, 0);
        // console.log ("===", hash);
        return hash;
    }
}

module.exports = API;
