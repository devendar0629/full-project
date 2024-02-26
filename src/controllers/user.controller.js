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

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        // because when the modified user is saved , mongoose tries to validate all fields
        await user.save({ validateBeforeSave:false })

        return {refreshToken,accessToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const loginUser = asyncHandler( async(req,res) => {
    // extract data from req
    // username or email based validation
    // find the user
    // check password
    // generate access and refresh tokens
    // send cookie

    const {email,username,password} = req.body

    if(!username && !email) {
        throw new ApiError(400,"Username or email is required");
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const passwordCheck = await user.isPasswordCorrect(password)

    if(!passwordCheck) {
        throw new ApiError(401,"Invalid user credentials");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    return res
            .status(200)
            .cookie("accessToken",accessToken,cookieOptions)
            .cookie("refreshToken",refreshToken,cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        // Here accessToken and refreshToken is sent bcoz the end client may be on mobile , or he wants to save that on localStorage
                        user:loggedInUser,
                        accessToken,
                        refreshToken,
                    },
                    "User logged in successfully"
                )
            )

} )

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            },
        },
        {
            new: true
        }
    )

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(
                new ApiResponse(200,{},"User logged out")
            )
})

export {
    registerUser,
    loginUser,
    logoutUser
}