import express from "express";
import cors from "cors";
import { initSocket } from "./socket/socket.js"; // Import the initSocket function from socket.tsx
import connectToMongoDb from "./connectTodb/connectToMongoDb.js";

const app = express();
app.use(cors());

app.use(express.json());

const port = 8000; // Define the port number

connectToMongoDb();

const server = initSocket(app); // Initialize the Socket.IO server with the Express app

server.listen(port, () => {
  console.log(`Application is running on port ${port}`);
});

app.get("/", (req, res) => {
  try {
    res.send(`Hello World!!!... this is server running on port ${port}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});