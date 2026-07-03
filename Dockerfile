# Use an official Node.js runtime as a parent image (Alpine is lightweight and secure)
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install application dependencies (only production dependencies)
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on (default 5000 as per your server.js)
EXPOSE 5000

# Define the command to run the app
CMD ["npm", "start"]
