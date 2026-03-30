const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
app.use(helmet()); // Set security-related HTTP headers
app.set("trust proxy", 1); // Allow express-rate-limit to work behind Vercel Proxy
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Google Safe Browsing Integration ---
// Read API key from environment variables
const SAFE_BROWSING_API_KEY = process.env.SAFE_BROWSING_API_KEY;

/**
 * Checks a URL against the Google Safe Browsing API.
 * @param {string} url - The URL to check
 * @returns {Promise<string>} - "safe", "malware", "phishing", "unwanted", or "unknown"
 */
async function checkSafeBrowsing(url) {
  // If no API key is set, log and return unknown to prevent crashing
  if (!SAFE_BROWSING_API_KEY) {
    console.warn("⚠️ Missing SAFE_BROWSING_API_KEY in .env");
    return "unknown";
  }

  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`;

  const payload = {
    client: {
      clientId: "url-shortener",
      clientVersion: "1.0.0"
    },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE"
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }] // Send the URL to evaluate
    }
  };

  try {
    // Send POST request with a 2000ms timeout
    const response = await axios.post(endpoint, payload, { timeout: 2000 });
    const matches = response.data.matches;

    // If Google finds a match, determine the threat type
    if (matches && matches.length > 0) {
      const threatType = matches[0].threatType;

      if (threatType === "MALWARE") return "malware";
      if (threatType === "SOCIAL_ENGINEERING") return "phishing";
      if (threatType === "UNWANTED_SOFTWARE") return "unwanted";
    }

    // No matches mean the URL is safe
    return "safe";
  } catch (error) {
    // Handle API errors gracefully
    console.error("Safe Browsing API Error:", error.message);
    return "unknown";
  }
}
// ----------------------------------------

// Global Rate Limiter: Prevent spam & abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests created from this IP, please try again after 15 minutes." }
});
app.use(limiter);

// --- DATABASE CONNECTION ---
const dbUri = process.env.MONGODB_URI;

if (!dbUri) {
  console.error("❌ CRITICAL ERROR: MONGODB_URI is not defined in environment variables!");
  console.error("If you are on Vercel, please run: npx vercel env push");
}

mongoose.connect(dbUri || "mongodb://localhost:27017/urlShortener")
  .then(() => console.log("✅ DB Connected Successfully"))
  .catch(err => {
    console.error("❌ DB Connection Error:", err.message);
    if (!dbUri) console.error("Hint: You are likely missing your .env variables on Vercel.");
  });

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}


const Url = require("./models/Url"); // Import the Url model

async function generateReadableCode(url) {
  const { nanoid } = await import("nanoid");
  try {
    const parsed = new URL(url);
    let name = parsed.hostname.replace("www.", "").split(".")[0];
    name = name.substring(0, 5);
    return name + "-" + nanoid(4);
  } catch {
    return nanoid(6);
  }
}

// --- ROUTES ---

// 1. Preview Route: Fetch title and description from URL
app.post("/preview", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });
  const valid = /^https?:\/\/.+/;
  if (!valid.test(url)) return res.status(400).json({ error: "Invalid URL" });

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    // SSRF Prevention: Block internal and loopback IP addresses 
    const isLocal = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|::1)$/i.test(hostname);

    if (isLocal) {
      return res.status(403).json({ error: "Internal URLs are strictly prohibited." });
    }

    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 3000 });
    const $ = cheerio.load(data);
    const title = $("title").text() || $("meta[property='og:title']").attr("content") || "No title found";
    const description = $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "";

    res.json({ title, description });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch URL preview" });
  }
});

// 2. Shorten Route: Create a new short URL
app.post("/shorten", async (req, res) => {
  const { url, customCode, password, expiresIn } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });

  const valid = /^https?:\/\/.+/;
  if (!valid.test(url)) return res.status(400).json({ error: "Invalid URL" });

  // 🛡 Google Safe Browsing Check
  const safetyStatus = await checkSafeBrowsing(url);

  // If the result is anything but "safe", we block it.
  // We allow "unknown" (API failures) so the server doesn't break if Google is down.
  if (safetyStatus !== "safe" && safetyStatus !== "unknown") {
    return res.status(403).json({ error: "This URL is not allowed." });
  }

  // Reuse Existing URL (if no extra parameters provided)
  if (!customCode && !password && !expiresIn) {
    const existingUrl = await Url.findOne({ url, password: null, expiresAt: null });
    if (existingUrl) {
      return res.status(200).json(existingUrl); // Return 200 OK for existing, not 201 Created
    }
  }

  let shortCode;
  if (customCode) {
    const exists = await Url.findOne({ shortCode: customCode });
    if (exists) return res.status(400).json({ error: "Custom code already taken" });
    shortCode = customCode;
  } else {
    do {
      shortCode = await generateReadableCode(url);
    } while (await Url.findOne({ shortCode }));
  }

  // Handle Password hashing
  let hashedPassword = null;
  if (password && password.trim() !== "") {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  // Handle Expiration
  let expiresAt = null;
  if (expiresIn && parseInt(expiresIn) > 0) {
    expiresAt = new Date(Date.now() + parseInt(expiresIn) * 1000);
  }

  const newUrl = await Url.create({
    url,
    shortCode,
    password: hashedPassword,
    expiresAt
  });

  res.status(201).json(newUrl);
});

// 3. Stats Route: Get access count and details
app.get("/shorten/:code/stats", async (req, res) => {
  const url = await Url.findOne({ shortCode: req.params.code });
  if (!url) return res.status(404).json({ error: "Not found" });

  res.json({
    url: url.url,
    shortCode: url.shortCode,
    accessCount: url.accessCount,
    expiresAt: url.expiresAt,
    isProtected: !!url.password
  });
});

// Ignore favicon requests
app.get(["/favicon.ico", "/favicon.png"], (req, res) => res.status(204).end());

// 4. Redirect Route: Handle redirection when visiting a short link
app.get("/:code", async (req, res) => {
  const url = await Url.findOne({ shortCode: req.params.code });

  if (!url) {
    return res.status(404).send("Not found");
  }

  // Check Expiration
  if (url.expiresAt && url.expiresAt < new Date()) {
    return res.status(410).send("410 Gone - This URL has expired.");
  }

  // Check Password
  if (url.password) {
    const inputPassword = req.query.password;
    if (!inputPassword) {
      return res.status(403).send("403 Forbidden - Password required! Add ?password=YOUR_PASSWORD to the URL.");
    }

    const isMatch = await bcrypt.compare(inputPassword, url.password);
    if (!isMatch) {
      return res.status(403).send("403 Forbidden - Incorrect password.");
    }
  }

  url.accessCount++; // increase count
  await url.save();

  res.redirect(url.url); // redirect to the original URL
});

// Removed unsafe PUT and DELETE routes protecting against unauthenticated overwrites.

// Global Error Handler to return JSON instead of HTML on crash
app.use((err, req, res, next) => {
  console.error("Backend Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Export the Express API for Vercel
module.exports = app;
