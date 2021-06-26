const express = require("express");
const mongoose = require("mongoose");
require("dotenv/config");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello world!");
});

const postsRoute = require("./routes/posts");
app.use("/api/v1/posts", postsRoute);

// Connect to the database
mongoose
  .connect(process.env.DB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("DB Connected!"))
  .catch((err) => {
    console.log(`DB Connection Error: ${err.message}`);
  });

app.listen(5000, () => console.log("Listening on port 5000..."));