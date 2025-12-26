import { Socket, Server as SocketIOServe } from "socket.io";
import User from "../models/User.js";
import { generateToken } from "../utils/token.js";


export function registerUserEvents(io: SocketIOServe, socket: Socket) {
    socket.on("testSocket", (data) => {
        socket.emit("testSocket", { msg: "its working again!!" });
    });


    socket.on("updateProfile", async (data: { name?: string; avatar?: string }) => {

        console.log("UpdateProfile event: ", data);
        const userId = socket.data.userId;

        if (!userId) {
            return socket.emit("updateProfile", { success: false, msg: "Unauthorized" });
        }

        try {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { name: data.name, avatar: data.avatar },
                { new: true } // returns the new user with updated values
            );

            if (!updatedUser) {
                return socket.emit("updateProfile", { success: false, msg: "User not found" });
            }

            // gen token if there is an user 
            const newToken = generateToken(updatedUser);

            socket.emit("updateProfile", { success: true, data: { token: newToken }, msg: "Profile updated successfully" });
        }
        catch (error) {
            console.log("Error updating profile: ", error);
            socket.emit("updateProfile", { success: false, msg: "Error updating profile" });
        }
    });


    socket.on("getContacts", async() => {
        try {
            const currentUserId = socket.data.userId;
            if(!currentUserId) {
                socket.emit("getContacts", {
                    success: false, 
                    msg: "Unauthorized"
                });
                return;
            }

            const users = await User.find(
                {_id: {$ne: currentUserId}},
                {password: 0}       // exculding password
            ).lean();               // will fetch js objects 

            const contacts = users.map((user) => ({
                id: user._id.toString(),
                name: user.name, 
                email: user.email, 
                avatar: user.avatar || ""
            }));

            socket.emit("getContacts", {
                success: true, 
                data: contacts
            });

        }
        catch(error) {
            console.log("getContacts error: ", error);
            socket.emit("getContacts", {
                success: false, 
                msg: "Failed to fetch contacts"
            })
        }
    })
}