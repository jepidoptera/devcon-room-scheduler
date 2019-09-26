var Airtable = require('airtable');
var base = new Airtable({apiKey: process.env.APIKEY}).base(process.env.AIRTABLE_BASE);

let rooms_cache = {};
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
            rooms_cache[record.id] = {name: record.get("Name")};
            rooms_cache[record.get("Name")] = {id: record.id};
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

const API = {
    getTalks: (callback) => {
        let pages = 1;
        let newTalks = [];

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
                                console.log("new speaker detected: ", speakerIDs[i], ". reloading...");
                                // re-load speakers and then call this function again
                                getSpeakers(() => API.getTalks(callback));
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
                        room: rooms_cache[record.get('Room')].name
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

            if (err) { console.error(err); return; }
            if (callback) {
                console.log('returning talks to server...')
                callback(talks_cache);
            }
        });    
    },
    
    // get all talks occurring in a particular room
    getFromRoom: (roomName) => {
        let filterTalks = talks_cache.filter(talk => talk.room === roomName);
        console.log(filterTalks);
        return filterTalks;
    },

    schedule: (deets) => {
        console.log('scheduling: ', deets);
        // unpack those details
        let {name, start_at, end_at, description, speakers, room} = deets;

        // create entries for speakers if none exist
        let missingSpeakers = speakers.filter(speaker => !speakers_cache[speaker]);
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
                    API.schedule(deets);
                }
            )
            // don't do anything until the speakers are added
            return;
        }

        base('Talks').create([
            {
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
        ], function(err, records) {
            if (err) {
                console.error(err);
                return;
            }
            // let it show up immediately
            talks_cache.push(deets);
            records.forEach(function (record) {
                console.log('added talk:', record.get('Name (english)'));
            });
        })
    }
}

// load caches
getRooms(() => getSpeakers(() => API.getTalks()));


// just keep updating in the background every ten seconds
setInterval(API.getTalks, 10000);
module.exports = API;