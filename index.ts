import express from "express";
import http from 'http';
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js"
import { initilizeSocket } from "./socket/socket.js";


dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Server is runningggg");
});


const PORT = process.env.PORT || 3000;

const server = http.createServer(app);


// listen to socket events 
initilizeSocket(server);


connectDB().then(() => {
    console.log("db connected")
    server.listen(PORT, '0.0.0.0' as any, () => {
        console.log("Server is running on port, mongo : ", PORT);
    });
})
.catch((error) => {
    console.log("Failed to start serve due to database connection error: ", error);
})
