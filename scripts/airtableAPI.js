var Airtable = require('airtable');
var base = new Airtable({apiKey: process.env.APIKEY}).base(process.env.AIRTABLE_BASE);

let rooms = {};
let speakers = {};

function getRooms() {
    base('Rooms').select({})
    .eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.

        // console.log(JSON.stringify(records));

        records.forEach(function(record) {
            // console.log("*****");
            // console.log(JSON.stringify(record));
            rooms[record.id] = {name: record.get("Name")};
        });
    
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();
    
    }, function done(err) {
        if (err) { console.error(err); return; }
    });    
}
// immediately load rooms
getRooms();

function getSpeakers(callback) {
    // re-load speakers
    speakers = {};
    base('Speakers').select({})
    .eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.

        // console.log(JSON.stringify(records));

        records.forEach(function(record) {
            // console.log("*****");
            // console.log(JSON.stringify(record));
            speakers[record.id] = {
                name: record.get("Name"),
                title: record.get("Title (english)"),
                affiliation: record.get("Affiliation"),
                bio: record.get("Bio (english)"),
            };
        });
    
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();
    
    }, function done(err) {
        console.log("******************** loaded speakers *******************");
        // console.log(speakers);
        if (err) { console.error(err); return; }
        if (callback) callback(speakers)
    });    
}
// immediately load rooms
getSpeakers();

const API = {
    getTalks: (callback) => {
        let pages = 1;
        let talks = [];

        base('Talks').select({})
        .eachPage(function page(records, fetchNextPage) {
            // This function (`page`) will get called for each page of records.
            console.log(`page ${pages++}...`);
        
            for (let n = 0; n < records.length; n++) {
                let record = records[n]
                // some "talks" are actually blank rows, so filter those out...
                if (record.get('Room')) {
                    // if we don't have a record for any listed speaker, that is an indication that we need to re-load
                    let speakerIDs = record.get('Speakers');
                    if (speakerIDs) {
                        for (let i = 0; i < speakerIDs.length; i++ )
                        {
                            if (!speakers[speakerIDs[i]]) {
                                console.log("new speaker detected: ", speakerIDs[i], ". reloading...");
                                // re-load speakers and then call this function again
                                getSpeakers(() => API.getTalks(callback));
                                return;
                            }
                        }
                    }
                    talks.push({
                        name: record.get('Name (english)'), 
                        start_at: record.get('Start at'), 
                        end_at: record.get('End at'), 
                        description: record.get('Description (english)'), 
                        speakers: speakerIDs 
                            ? speakerIDs.map(id => speakers[id].name)
                            : [], 
                        room: rooms[record.get('Room')].name
                    });
                }
            }
        
            // To fetch the next page of records, call `fetchNextPage`.
            // If there are more records, `page` will get called again.
            // If there are no more records, `done` will get called.
            fetchNextPage();
        
        }, function done(err) {
            console.log('done.');
            if (err) { console.error(err); return; }
            if (callback) {
                console.log('returning talks to server...')
                callback(talks);
            }
            else {
                console.log('no callback provided.');
            }
        });    
    }
}

module.exports = API;