import express from "express";
import routes from "./routes/routes";

const app = express();
const path = require('path');
const PORT = process.env.PORT || 3001;

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/", routes);

console.log("node env =", process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, 'client/build')));
}

// Start the server
app.listen(PORT, function() {
  console.log(`🌎  ==> Server now listening on PORT ${PORT}!`);
});
