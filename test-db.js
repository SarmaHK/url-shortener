const mongoose = require("mongoose");
const Url = require("./models/Url");
const bcrypt = require("bcrypt");
require("dotenv").config();

async function runTest() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const testCode = "test" + Date.now();
  const password = "123";
  const hashedPassword = await bcrypt.hash(password, 10);

  await Url.create({
    url: "https://google.com",
    shortCode: testCode,
    password: hashedPassword
  });

  console.log("Created test URL:");
  console.log(`Code: ${testCode}`);
  console.log(`Password: ${password}`);
  
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
