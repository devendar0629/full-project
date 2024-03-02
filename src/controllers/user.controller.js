import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFile } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "fs";
import {
    CLOUDINARY_AVATAR_FOLDER,
    CLOUDINARY_COVERIMAGE_FOLDER,
} from "../constants.js";

const registerUser = asyncHandler(async (req, res) => {
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

    const { fullName, email, username, password } = req.body;

    // Beginners code to validate every field , if it is not empty
    // if(fullName === "") {
    //     throw new ApiError(400,"Full name is required")
    // }

    // TODO : Make a separate file add validators like validateEmail and execute them from here
    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === "" || !field
        )
    ) {
        // remove locally uploaded files , if uploaded
        fs.unlinkSync(req.files?.coverImage[0]?.path);
        fs.unlinkSync(req.files?.avatar[0]?.path);

        throw new ApiError(
            400,
            "Fields: fullName, username, email, password are required"
        );
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        // remove locally uploaded files
        fs.unlinkSync(req.files?.coverImage[0]?.path);
        fs.unlinkSync(req.files?.avatar[0]?.path);

        throw new ApiError(
            409,
            "User with given username or email already exists"
        );
    }

    let avatarLocalPath;

    if (
        req.files &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
    ) {
        avatarLocalPath = req.files.avatar[0].path;
    } else {
        throw new ApiError(400, "Avatar file is required");
    }

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = await uploadFile(avatarLocalPath, CLOUDINARY_AVATAR_FOLDER);
    const coverImage = await uploadFile(
        coverImageLocalPath,
        CLOUDINARY_COVERIMAGE_FOLDER
    );

    if (!avatar) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    if (!coverImage) {
        throw new ApiError(500, "Error while uploading cover image");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered successfully")
        );
});

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        // because when the modified user is saved , mongoose tries to validate all fields
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh token"
        );
    }
};

const loginUser = asyncHandler(async (req, res) => {
    // extract data from req
    // username or email based validation
    // find the user
    // check password
    // generate access and refresh tokens
    // send cookie

    // TODO: here form data is not working ,check
    const { email, username, password } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const passwordCheck = await user.isPasswordCorrect(password);

    if (!passwordCheck) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    // Here accessToken and refreshToken is sent bcoz the end client may be on mobile , or he wants to save that on localStorage
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { newAccessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user?._id);

        const cookieOptions = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        newAccessToken,
                        newRefreshToken,
                    },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid refresh token");
    }
});

const changeUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(
            401,
            "fields: Old password and New password are required"
        );
    }

    const currentUser = await User.findById(req.user?._id);
    const passwordCheck = await currentUser.isPasswordCorrect(oldPassword);

    if (!passwordCheck) {
        throw new ApiError(400, "Old Password is incorrect");
    }

    currentUser.password = newPassword;
    await currentUser.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully")
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "Fullname and email are required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
            },
        },
        {
            new: true,
        }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Account details updated successfully"
            )
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // Bcoz we need only one file ,b4 in register it was 2 bcoz we added them as middleware
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadFile(avatarLocalPath, CLOUDINARY_AVATAR_FOLDER);

    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-passsword");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Avatar image changed successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // Bcoz we need only one file ,b4 in register it was 2 bcoz we added them as middleware
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is missing");
    }

    const coverImage = await uploadFile(
        coverImageLocalPath,
        CLOUDINARY_COVERIMAGE_FOLDER
    );

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading Cover image");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select("-passsword");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "Cover image changed successfully"
            )
        );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const data = await User.aggregate([
        {
            $match: {
                // optional chaining bcoz the user may not be found
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                // CAUTION : give the name that mongoDB generates for every model
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                // CAUTION : give the name that mongoDB generates for every model
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                isSubscribed: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
            },
        },
    ]);

    if (!data?.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, data, "User fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    //THINK : It is another method , without getting username as a paramater from the req -> req.params , like from earlier handler
    const user = await User.aggregate([
        {
            $match: {
                /*  We can't use req.user?._id directly , because req.user?._id returns string and we need to covert it to mongoDB id by using mongoose */
                _id: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        avatar: 1,
                                        username: 1,
                                    },
                                },
                            ],
                        },
                    },
                    // TODO : Print the result of this aggregation without this pipeline and see the difference
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    if (!user) {
        throw new ApiError(500, "Error fetching watch history");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        );
});

// TODO : Write file updation controllers in a new file or new different endpoint | Don't push everything in a single endpoint

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
