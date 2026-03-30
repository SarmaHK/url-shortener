const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config(); // Load environment variables from .env file
const safetyConfig = require("./utils/safetyConfig"); // Import safety filter rules

const app = express();
app.use(helmet()); // Set security-related HTTP headers
app.set("trust proxy", 1); // Allow express-rate-limit to work behind Vercel Proxy
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Custom Safety Check: Scans URL and its content for 18+ or spam material.
 * @param {string} url - The URL to check
 * @returns {Promise<{safe: boolean, reason?: string}>}
 */
async function checkContentSafety(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. Blocked Domains Check
    if (safetyConfig.blockedDomains.some(d => hostname.includes(d))) {
      return { safe: false, reason: "Domain is on the restricted list." };
    }

    // 2. Blocked TLDs Check
    if (safetyConfig.blockedTLDs.some(tld => hostname.endsWith(tld))) {
      return { safe: false, reason: `Links with ${hostname.split('.').pop()} extension are not allowed.` };
    }

    // 3. Simple Keyword Check in URL string
    const urlString = url.toLowerCase();
    if (safetyConfig.blockedKeywords.some(word => urlString.includes(word))) {
      return { safe: false, reason: "URL contains restricted keywords." };
    }

    // 4. Deep Content Scan (Title & Meta Tags)
    try {
      const { data } = await axios.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' }, 
        timeout: 4000 // 4 seconds limit for safety check
      });
      const $ = cheerio.load(data);
      const pageText = ($("title").text() + " " + ($("meta[name='description']").attr("content") || "")).toLowerCase();
      
      if (safetyConfig.blockedKeywords.some(word => pageText.includes(word))) {
        return { safe: false, reason: "Website content is flagged as inappropriate or spam." };
      }
    } catch (fetchError) {
      // If we can't reach the site, we still allow the shortening (unless it's a known bad domain)
      console.warn("Safety Scan skipped (Site unreachable):", fetchError.message);
    }

    return { safe: true };
  } catch (err) {
    return { safe: false, reason: "Invalid URL provided." };
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
// Mongoose Connection Management for Serverless
const dbUri = process.env.MONGODB_URI;
mongoose.set("bufferCommands", false); // Fail fast instead of buffering if DB is disconnected

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;

  if (!dbUri) {
    console.error("❌ CRITICAL ERROR: MONGODB_URI is not defined!");
    return;
  }

  try {
    const db = await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ DB Connected Successfully");
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
  }
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
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


  // 🛡 Adult & Spam Content Check (Custom Filter)
  const contentSafety = await checkContentSafety(url);
  if (!contentSafety.safe) {
    return res.status(403).json({ error: contentSafety.reason || "This URL is not allowed due to safety policies." });
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
  // Split the code from the password if provided in format: code=pass
  let [code, urlPassword] = req.params.code.split('=');
  
  const url = await Url.findOne({ shortCode: code });

  if (!url) {
    return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  // Check Expiration
  if (url.expiresAt && url.expiresAt < new Date()) {
    return res.status(410).send("410 Gone - This URL has expired.");
  }

  // Check Password
  if (url.password) {
    const inputPassword = urlPassword || req.query.password;
    
    if (!inputPassword) {
      return res.status(403).sendFile(path.join(__dirname, 'public', 'password.html'));
    }

    const isMatch = await bcrypt.compare(inputPassword, url.password);
    if (!isMatch) {
      return res.status(403).sendFile(path.join(__dirname, 'public', 'password.html'));
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
