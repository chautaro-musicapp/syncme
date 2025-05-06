import { model } from "mongoose";
import {messageSchema} from "./message.js";
import { roomSchema } from "./Room.js";


export let Message = model("Message", messageSchema); // Create a model for the messages collection using the message schema
export let Room = model("Room", roomSchema); // Create a model for the rooms collection using the room schema