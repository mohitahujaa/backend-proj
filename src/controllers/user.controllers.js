import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const registerUser = asyncHandler( async (req, res) => {

    //take data from frontend (for now through postman)
    //validate if any required field is empty
    //validate email and password formats
    //check if the user already exists
    //see the multer middleware to upload to public folder
    //see cloudinary functionality to return valid url
    //validate all the fields
    //create an object and upload to db
    //return the response to user

    //step 1 take data from frontend and multer as a midlleware would add into req.files
    const {username, fullName, password, email} = req.body;
    const userData = [username, fullName, password, email];

    //step2
    if(userData.some((field) => (!field) || field?.trim() === "" )){
        console.log("all are required");
        throw new ApiError(400, "All fields are requried");
    }

    //step3 checking email format only for now 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if(!emailRegex.test(email)){
        throw new ApiError(400, "Enter a valid email");
    }
    console.log(`${email} entered is fine`);

    //step 4 checking if the user already exists
    const existingUser = await User.findOne({
        $or:[{username}, {email}]
    })

    if(existingUser){
        throw new ApiError(409, "User already exists");
    }

    // console.log(existingUser);
    // console.log("User does not exist already");
    // console.log(req.files); -- we are getting files 

    console.log(req.files);

   const avatarLocalPath = req.files?.avatar?.[0]?.path;
   const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400, "Avatar is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar is required");
    }

    console.log(avatar);
    console.log(coverImage);

    const user = await User.create({
        username : username.toLowerCase(),
        fullName,
        password,
        email,
        avatar : avatar.url,
        coverImage : coverImage?.url ?? ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser) throw new ApiError(500, "Something went wrong while registering the user");

    return res.json(new ApiResponse(201, "Registered succesfully", createdUser));
})

export { registerUser }