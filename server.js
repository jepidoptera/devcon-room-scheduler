const express =  require("express");
const path = require('path');
require('dotenv').config();

const router = require('./routes/router');

const app = express();
const PORT = process.env.PORT || 3001;


// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(router);

console.log("node env =", process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, 'client/build')));
}

// use handlebars
var exphbs = require("express-handlebars");
app.engine(".hbs", exphbs({
    defaultLayout: "main",
    extname: ".hbs",
    helpers: {
    // capitalize words on request
        'Capitalize': function(string)
        {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
    }
}));
app.set("view engine", ".hbs");


// Start the server
app.listen(PORT, function() {
  console.log(`🌎  ==> Server now listening on PORT ${PORT}!`);
});
