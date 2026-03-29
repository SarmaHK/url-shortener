const mongoose = require("mongoose"); // Import the mongoose library to define the schema and model for the URLs collection in the MongoDB database

const urlSchema = new mongoose.Schema({
  url: String, // The original long URL
  expiresAt: { type: Date, default: null }, // Optional expiration date for the URL
  password: { type: String, default: null }, // Optional hashed password for the URL
  shortCode: { type: String, unique: true }, // The unique short code for the URL
  accessCount: { type: Number, default: 0 } // The number of times the short URL has been accessed
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model("Url", urlSchema); // Export the Url model based on the urlSchema