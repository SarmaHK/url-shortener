const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// connect database
mongoose.connect("mongodb+srv://sarmahk:2307@cluster0.qvy8cbw.mongodb.net/urlShortener?retryWrites=true&w=majority")
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

// start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

const Url = require("./models/Url"); // Import the Url model to interact with the URLs collection in the database
const { nanoid } = require("nanoid"); // Import the nanoid library to generate unique short codes for the URLs


function generateReadableCode(url) {
  try {
    const parsed = new URL(url);

    // get domain name
    let name = parsed.hostname.replace("www.", "").split(".")[0];

    // clean + shorten
    name = name.substring(0, 5);

    return name + "-" + nanoid(4);
  } catch {
    return nanoid(6);
  }
}

// Define a POST route at /shorten to handle URL shortening requests.
// This route validates the provided URL, generates a unique short code, and saves the original URL along with the short code in the database. 
// It then returns the newly created URL entry in the response
app.post("/shorten", async (req, res) => {
  const { url, customCode } = req.body; // Extract the original long URL from the request body

  if (!url) {
    return res.status(400).json({ error: "URL is required" }); // If the URL is not provided in the request body, return a 400 Bad Request response with an error message
  }

  const valid = /^https?:\/\/.+/;
  if (!valid.test(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  let shortCode;

  if (customCode) {
    const exists = await Url.findOne({ shortCode: customCode });

    if (exists) {
      return res.status(400).json({ error: "Custom code already taken" });
    }

    shortCode = customCode;
  } else {
    do {
      // Generate a unique short code combining the domain name and random nanoid letters
      shortCode = generateReadableCode(url);
    } while (await Url.findOne({ shortCode }));
  }

  const newUrl = await Url.create({
    url,
    shortCode
  });

  res.status(201).json(newUrl);
});


// Define a GET route at /shorten/:code to retrieve the original long URL based on the provided short code in the URL parameters
// Define a GET route at /:code to handle redirection to the original long URL based on the provided short code in the URL parameters. 
// This route also increments the access count for the URL each time it is accessed
app.get("/:code", async (req, res) => {
  const url = await Url.findOne({ shortCode: req.params.code });

  if (!url) {
    return res.status(404).send("Not found");
  }

  url.accessCount++; // increase count
  await url.save();

  res.redirect(url.url); // redirect to the original URL
});


// Define a PUT route at /shorten/:code to update the original long URL associated with the provided short code in the URL parameters
app.put("/shorten/:code", async (req, res) => {
  const { url } = req.body;

  const valid = /^https?:\/\/.+/;
  if (url && !valid.test(url)) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  const updated = await Url.findOneAndUpdate(
    { shortCode: req.params.code },
    { url },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(updated);
});

// Define a DELETE route at /shorten/:code to delete the URL entry associated with the provided short code in the URL parameters
app.delete("/shorten/:code", async (req, res) => {
  const deleted = await Url.findOneAndDelete({
    shortCode: req.params.code
  });

  if (!deleted) {
    return res.status(404).json({ error: "Not found" });
  }

  res.status(204).send();
});


// Define a GET route at /shorten/:code/stats to retrieve the statistics (original URL, short code, and access count) for the provided short code in the URL parameters
app.get("/shorten/:code/stats", async (req, res) => {
  const url = await Url.findOne({ shortCode: req.params.code });

  if (!url) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({
    url: url.url,
    shortCode: url.shortCode,
    accessCount: url.accessCount
  });
});