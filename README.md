# URL Shortener API

A beginner-friendly Node.js and Express API that takes long URLs and creates customized or randomized short links. This project uses MongoDB for database storage and `nanoid` for generating unique identifiers.

## Features Added & Bugs Fixed

Throughout the development of this project, several key improvements and features were implemented:

1. **Database Migration to MongoDB Atlas:** 
   - Moved from a local MongoDB connection (`mongodb://127.0.0.1:27017`) to a cloud-based **MongoDB Atlas** database, fixing issues where the app would get stuck or fail to start without a local database installed.

2. **Custom URL Generation (`customCode`):**
   - Added the ability for users to provide a `customCode` when making a POST request.
   - Built-in availability checking: The API searches the database using `Url.findOne()` to ensure the desired custom short code isn't already taken before applying it.

3. **"Relatable" Random Short Codes:**
   - Implemented a `generateReadableCode()` function that creates highly relatable short links.
   - If a custom code is not provided, the API automatically parses the long URL's hostname (e.g., extracting "google" from `https://www.google.com`), slices it to 5 characters, and appends a secure 4-character ID (using `nanoid(4)`).

4. **URL Format Validation:**
   - Integrated Regex validation (`/^https?:\/\/.+/`) to verify that users are submitting valid `http` or `https` links before processing or saving them to the database.

5. **Code Cleanup & Refactoring:**
   - Merged duplicated route handlers (`app.post('/shorten')` and `app.get('/:code')`) into single, streamlined routes.
   - Fixed top-level execution errors by properly scoping all database interaction code inside of the endpoint functions.
   - Maintained all original instructional/learning comments so the code remains easy to study and understand.

## Endpoints

- **`POST /shorten`**: Submit a JSON body with `url` (and an optional `customCode`) to generate a new shortened link.
- **`GET /:code`**: Access the short link. The server will automatically increment the `accessCount` and redirect the user to the original long URL.
- **`GET /shorten/:code/stats`**: Retrieve statistics about the shortened link, including how many times it has been clicked.
- **`PUT /shorten/:code`**: Update the destination URL for an existing short code.
- **`DELETE /shorten/:code`**: Delete the URL entry entirely.

## Technologies Used

- **Node.js**: Backend runtime
- **Express**: Web server framework
- **Mongoose**: MongoDB Object Modeling Tool
- **Nanoid**: Secure, URL-friendly unique ID generator
