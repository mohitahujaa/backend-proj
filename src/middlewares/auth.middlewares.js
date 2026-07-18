import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    //step1 : getting access token
    const token = req.cookies?.accessToken || req.get("Authorization")?.replace("Bearer ", "");
    if(!token) throw new ApiError(401, "Invalid access token");

    //step2 : verifying access token against our secret 
    var decodedToken;
    try{
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    }catch(error){
        throw new ApiError(401, "Invalid access token");
    }

    // step3 : query db to get details    
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    //if document with that id is not found it returns null not an error
    if(!user) throw new ApiError(404, "User does not exist");
    
    //step4 : assingning req.user
    req.user = user; 
    next() //important      
    
})