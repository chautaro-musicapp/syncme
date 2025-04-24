import mongoose from "mongoose";

const connectToMongoDb = () => {
  mongoose.connect("mongodb://0.0.0.0:27017/syncme");
  console.log("application is connected to MongoDB successfully");
};

export default connectToMongoDb;
