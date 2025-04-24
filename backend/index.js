import express from "express";
import cors from "cors";

let app = express();
app.use(cors());

app.use(express.json());


connectToMongoDb();

app.listen(8000, () => {
  console.log("application is running at port 8000");
});

app.get("/", (req, res) => {
  res.send(`Hello World!!!... this is server running on port ${Port}`);
});
