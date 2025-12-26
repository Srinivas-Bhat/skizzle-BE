import { Socket, Server as SocketIOServe } from "socket.io";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export function registerChatEvents(io: SocketIOServe, socket: Socket) {
    socket.on("newConversation", async(data) => {
        console.log("newConversation event: ", data);

        try {
            if(data.type == 'direct') {
                const existingConversation = await Conversation.findOne({
                    type: "direct",
                    participants: {$all: data.participants, $size: 2}, 
                }).populate({
                    path: "participants",
                    select: "name avatar email",
                })
                .lean();

                if(existingConversation) {
                    socket.emit("newConversation", {
                        success: true, 
                        data: {...existingConversation, isNew: false},
                    });
                    return;
                }
            }


            // create new conversation 
            const conversation = await Conversation.create({
                type: data.type, 
                participants: data.participants, 
                name: data?.name || "",             // could be empty if direct conversation
                avatar: data.avatar || "",          // -- do --
                createdBy: socket.data.userId
            });

            // get all connected sockets. (getting all online users)
            const connectedSockets = Array.from(io.sockets.sockets.values()).filter((s: any) => data.participants.includes(s.data.userId))


            // join the conversation by all online participants
            connectedSockets.forEach(participantSocket => {
                participantSocket.join(conversation._id.toString());
            });


            // send conversation daata back (populated )
            const populatedConversation = await Conversation.findById(conversation._id).populate({
                path: "participants",
                select: "name avatar email"
            }).lean();

            if(!populatedConversation) {
                throw new Error("Failed to populate conversation");
            }

            // emit conversation to all participants
            io.to(conversation._id.toString()).emit("newConversation", {
                success: true, 
                data: {...populatedConversation, isNew: true},
            });

        }
        catch(error) {
            console.log("newConversation error: ", error);
            socket.emit("newConversation", {
                success: false, 
                msg: "Failed to create conversation",
            });
        }
    });


    // get conversation function 
    socket.on("getConversations", async(data) => {
        console.log("get Conversations event");

        try {
            const userId = socket.data.userId;
            if(!userId) {
                socket.emit("getConversations", {
                    success: false, 
                    msg: "Unauthorized"
                });
                return;
            }

            // fetching all the conversation events where he is the part of
            const conversations = await Conversation.find({
                participants: userId
            })
            .sort({updatedAt: -1})
            .populate({
                path: "lastMessage",
                select: "content senderId attachement createdAt"
            })
            .populate({
                path: "participants",
                select: "name avatar email"
            }).lean();

            socket.emit("getConversations",  {
                success: true, 
                data: conversations
            });

        }
        catch(error) {
            console.log("getConversations error: ", error);
            socket.emit("getConversations", {
                success: false, 
                msg: "Failed to fetch conversations",
            });
        }
    });


    // new message event 
    socket.on("newMessage", async(data) => {
        console.log("new Message event", data);

        try {
            const message = await Message.create({
                conversationId: data.conversationId, 
                senderId: data.sender.id, 
                content: data.content, 
                attachement: data.attachement, 
            });

            io.to(data.conversationId).emit("newMessage", {
                success: true, 
                data: {
                    id: message._id, 
                    content: data.content, 
                    sender: {
                        id: data.sender.id, 
                        name: data.sender.name, 
                        avatar: data.sender.avatar,
                    },
                    attachement: data.attachement, 
                    createdAt: new Date().toISOString(),
                    conversationId: data.conversationId,
                },
            });

            // update conversation's last message
            await Conversation.findByIdAndUpdate(data.conversationId, {
                lastMessage: message._id
            });

        }
        catch(error) {
            console.log("newMessage error: ", error);
            socket.emit("newMessage", {
                success: false, 
                msg: "Failed to send new message",
            });
        }
    });


    // get message event 
    socket.on("getMessages", async(data: {conversationId: string})  => {
        console.log("get messages event", data);

        try {
            const messages = await Message.find({
                conversationId: data.conversationId,
            })
            .sort({createdAt: -1})
            .populate<{senderId: {_id: string, name: string, avatar: string}}>({
                path: "senderId", 
                select: "name avatar"
            }).lean();

            const messageWithSender = messages.map(message => ({
                ...message,
                id: message._id, 
                sender: {
                    id: message.senderId._id, 
                    name: message.senderId.name,
                    avatar: message.senderId.avatar,
                }
            }));

            socket.emit("getMessages", {
                success: true, 
                data: messageWithSender
            });
        }
        catch(error) {
            console.log("getMessages error: ", error);
            socket.emit("getMessages", {
                success: false, 
                msg: "Failed to get messages",
            });
        }
    });

}