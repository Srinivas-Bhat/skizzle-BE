
import {Server as SocketIOServe, Socket} from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { registerUserEvents } from "./userEvents.js";
import { registerChatEvents } from "./chatEvents.js";
import Conversation from "../models/Conversation.js";

dotenv.config();


export function initilizeSocket(server: any): SocketIOServe {
    const io = new SocketIOServe(server, {
        cors: {
            origin: "*",
        }
    });


    // auth middleware 
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token;
        if(!token) {
            return next(new Error("Authentication error: no token provided"));
        }

        jwt.verify(token, process.env.JWT_SECRET as string, (error: any, decoded: any) => {
            if(error) {
                return next(new Error("Authentication error: no token provided"));
            }

            // attach user data to socket
            let userData = decoded.user;
            console.log("userData Decoded new : ", JSON.stringify(userData));
            socket.data = userData;
            socket.data.userId = userData.id;
            next();

        });
        
    });


    // when socket connects, register events 
    io.on('connection', async(socket: Socket) => {
        const userId = socket.data.userId;
        console.log("socket Data", socket.data);
        console.log(`User connected new : ${userId}, username: ${socket.data.name}`);


        // register events 
        registerUserEvents(io, socket);
        registerChatEvents(io, socket);

        // join all the conversation the user is part of 
        try {
            const conversations = await Conversation.find({
                participants:  userId 
            }).select("_id");

            // creating a room of all conversations for the current user; 
            // he receives all the ones who texted him
            conversations.forEach((conversation) => {
                socket.join(conversation._id.toString());
            });
        }
        catch(error: any) {
            console.log("Error joining conversations: ", error);
        }


        socket.on('disconnect', () => {
            // user logs out 
            console.log(`user disconnected new : ${userId}`);
        })
    })

    return io;
}