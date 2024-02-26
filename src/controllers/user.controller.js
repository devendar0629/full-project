import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler( async (req,res) => {
    // STEPS :
    // get user details from frontend
    // validation - not empty
    // check if user already exists: based on username and email
    // check for images , check for avatar
    // upload them to cloudinary, check avatar upload status
    // create user object - create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response


    const {fullName,email,username,password} = req.body

    // Beginners code to validate every field , if it is not empty
    // if(fullName === "") {
    //     throw new ApiError(400,"Full name is required")
    // }

    // TODO : Make a separate file add validators like validateEmail and execute them from here
    if(
        [fullName,email,username,password].some((field) => (field?.trim() === ""))
    ) {
        throw new ApiError(400,"All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser) {
        throw new ApiError(409, `User with username: ${username} or email: ${email} already exists`)
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    let avatarLocalPath;

    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path
    }else{
        avatarLocalPath = null
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.fiiles.coverImage[0].path
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        // TODO : Make error message more understandable
        throw new ApiError(400,"Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

} )

export {registerUser}