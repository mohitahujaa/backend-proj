import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.models.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import jwt from "jsonwebtoken";

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async (user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };

    } catch (err) {
        throw new ApiError(500, "Server error : cant issue tokens right now");
    }
}

const registerUser = asyncHandler(async (req, res) => {

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
    const { username, fullName, password, email } = req.body;
    const userData = [username, fullName, password, email];

    //step2 checking if any field is empty
    if (userData.some((field) => (!field) || field?.trim() === "")) {
        console.log("all are required");
        throw new ApiError(400, "All fields are requried");
    }

    //step3 checking email format only for now 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Enter a valid email");
    }

    //step 4 checking if the user already exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    //step 5 : checking if the localfilepath exists 
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");


    //step 6 : uploading on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    //step 7 : saving to DB using User.create
    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        password,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url ?? ""
    })

    //step 8 : preparing the response for user
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) throw new ApiError(500, "Something went wrong while registering the user");

    //step 9 : send user apt response
    return res.status(201).json(new ApiResponse(201, "Registered succesfully", createdUser));
})


const loginUser = asyncHandler(async (req, res) => {
    //take email, password from the frontend (postman)
    //check if email,password are not empty
    //check if email format is valid
    //check if email exists in db
    //check if the given password is correct
    //generate refreshToken and accessToken
    //attach cookies
    //send apt response

    // step1 : taking data through req.body using multer (multer.none)
    const { email, password } = req.body;

    //step2 : checking if any field is empty or null/undefined
    if ([email, password].some((field) => {
        field.trim === "" || (!field)
    })) {
        throw ApiError(400, "All fields are required");
    }

    //step3 : validating email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) throw new ApiError(400, "Enter a valid email");

    //step4 : finding user in DB
    const user = await User.findOne({ email });
    if (!user) throw new ApiError(400, "Invalid email or password");

    //step5 : match password against stored in DB
    const isCorrect = await user.isPasswordCorrect(password);
    if (!isCorrect) { throw new ApiError(401, "Invalid email or password") }

    //step6 : generate refreshToken and accessToken
    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user);

    //step7 : preparing the response for client
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshToken;


    //step8 : preparing the cookie option -- at line 8 (options)

    //step9 : sending response to client
    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, "User logged in successfully", {
                user: safeUser, refreshToken, accessToken
            })
        );

})

const logoutUser = asyncHandler(async (req, res) => {
    //user is not sending anything himself, so how to get user details --> 
    //auth.middleware places the user data in req.user through auth.middleware.js

    //step 1 : get user details -> req.user
    //step 2 : set refreshToken as undefined
    //step 3: save to db and send res


    //this code will generate a mongoose document, then modify, then pre hook, then save 
    // const user = await User.findById(req.user?._id);
    // user.refreshToken = undefined;
    // await user.save({ validateBeforeSave: false });

    //better code
    await User.findByIdAndUpdate(req.user?._id,
        {
            $unset:{
                refreshToken: 1 // only field name is req for unset, it can be any value 1, true, ""
            }
        },
        {
            new: true
        }
    );
    
    res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json( new ApiResponse(200, "User successfully Logged out"));


})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //step 1: get refresh Token and validate
    const incomingRefeshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if(!incomingRefeshToken) throw new ApiError(401, "Unauthorized request");


    //step 2: verify the refresh token
    var decodedToken;
    try {
        decodedToken = jwt.verify(incomingRefeshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch (error) {
        throw new ApiError(401, "Unauthorized request");
    }

    //step 3 : match the refresh token if it is the same as in db, (a user can send older refresh token intentionally) -- important
    const user = await User.findById(decodedToken._id)
    if(!user) throw new ApiError(401, "Unauthorised request");

    if(user.refreshToken !== incomingRefeshToken) throw new ApiError(401, "Refresh Token is expired or used");

    //step 4 : generate new access and refresh token and send response
    const {refreshToken, accessToken } = await generateAccessAndRefreshToken(user);

    res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(200, "Access Token refreshed", {
        refreshToken,
        accessToken
    }))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken }