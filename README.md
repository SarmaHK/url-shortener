# 🔗 URL Shortener

A high-performance, full-stack URL shortener built with **Node.js, Express, and MongoDB**, featuring a beautiful glassmorphism UI, advanced security, link expiration, password protection, and automated Google Safe Browsing checks to prevent malicious links.

Perfect for personal use, marketing campaigns, or as a polished SaaS MVP.

---

## ✨ Key Features

- **🎨 Beautiful UI**: A fully responsive, modern frontend designed with glassmorphism and smooth animations.
- **🛡️ Secure Processing**:
  - Validates URLs prior to processing.
  - Automatically checks links against **Google Safe Browsing API** to block phishing and malware.
  - Built-in **Rate Limiting** to prevent spam and abuse.
- **🔐 Password Protection**: Secure your shortened URLs so only authorized users with the password can access the destination.
- **⏳ Link Expiration**: Set links to automatically expire after 1 hour, 1 day, 7 days, or a custom amount of time.
- **✨ Custom & Smart Aliases**: Users can define their own `customCode` (e.g., `/my-promo`), or the system will automatically generate a highly readable code based on the target website's domain (e.g., `googl-abcd`).
- **📊 Link Analytics**: Built-in access tracking. The API tallies clicks every time a short link is used.
- **🚀 Serverless Ready**: Designed, structured, and optimized out-of-the-box for seamless deployment on **Vercel** (`@vercel/node`).

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Security**: `bcrypt` (password hashing), `helmet` (HTTP headers), `express-rate-limit` (DDoS protection)
- **Utilities**: `nanoid` (unique IDs), `axios` & `cheerio` (link preview scraping)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- A [MongoDB database](https://www.mongodb.com/atlas/database) (Local or Cloud/Atlas)
- A *Google Safe Browsing API Key* (Optional, but recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/url-shortener.git
cd url-shortener
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/urlShortener
SAFE_BROWSING_API_KEY=your_google_api_key_here
```

### 4. Run Locally
```bash
npm run dev
```
Visit `http://localhost:5000` in your browser.

---

## 📡 API Reference

All requests and responses use `application/json` format.

| Method   | Endpoint                  | Description                                      | Requires Auth  |
| -------- | ------------------------- | ------------------------------------------------ | -------------- |
| `POST`   | `/preview`                | Fetches the Title & Description of a target URL. | No             |
| `POST`   | `/shorten`                | Generates a new short URL.                       | No             |
| `GET`    | `/:code`                  | Redirects the user to the underlying long URL.   | *(If expected)*|
| `GET`    | `/shorten/:code/stats`    | Retrieves analytics and statistics for a link.   | No             |
| `PUT`    | `/shorten/:code`          | Updates the destination of an existing short URL.| No             |
| `DELETE` | `/shorten/:code`          | Deletes a shortened URL entirely.                | No             |

---

## ☁️ Deployment (Vercel)

This project is already pre-configured for Vercel!

1. Import your GitHub repository into [Vercel](https://vercel.com/new).
2. Go to **Settings > Environment Variables** and add your `MONGODB_URI` and `SAFE_BROWSING_API_KEY`.
3. *(Important!)* If using MongoDB Atlas, make sure to add `0.0.0.0/0` in your MongoDB **Network Access** settings to allow Vercel's Edge network to communicate with your database.
4. Click **Deploy**. Vercel will automatically handle the routing and serve your Express API and static frontend files perfectly.

---

## 📝 License

This project is licensed under the MIT License.

---
*Built with lessons learned - Sarma HK ✍️*
