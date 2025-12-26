import { Request, Response } from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/token.js";


export const registerUser = async(req: Request, res: Response): Promise<void> => {

    const {email, password, name, avatar} = req.body;
    try {
        let user = await User.findOne({email});
        if(user) {
            res.status(400).json({success: false, msg: "User already exists"});
            return;
        } 

        // create new user
        user = new User({
            email, 
            name, 
            password, 
            avatar: avatar || "",
        })

        // hashing password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        //save user
        await user.save();

        //gen token
        const token = generateToken(user);
        
        res.json({
            success: true, 
            token
        })

    }
    catch(error) {
        console.log("error", error);
        res.send(500).json({succes: false, msg: "Serve"})
    }
}


export const loginUser = async(req: Request, res: Response): Promise<void> => {
    const {email, password } = req.body;
    try {
        
        const user = await User.findOne({email});
        
        if(!user) {
            res.status(400).json({success: false, msg: "Invalid credentials"});
            return 
        }

        // compare password 

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            res.status(400).json({success: false, msg: "Invalid credentials"});
            return ;
        }

        //gen token
        const token = generateToken(user);
        
        res.json({
            success: true, 
            token
        })


    }
    catch(error) {
        console.log("error", error);
        res.send(500).json({succes: false, msg: "Serve"})
    }
}