import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";

const getUserTweets = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, userId } = req.params;

    if (!isValidObjectId(userId) || !userId?.trim())
        throw new ApiError(400, "User id is either invalid or required");

    // if page is NaN or less than 0 , set it to default -> 1
    page = isNaN(page) || parseInt(page) <= 0 ? 1 : parseInt(page);

    // if limit is NaN or less than 0 , set it to default -> 10
    limit = isNaN(limit) || parseInt(limit) <= 0 ? 10 : parseInt(limit);

    const checkUser = await User.exists({
        _id: new mongoose.Types.ObjectId(userId),
    });

    if (!checkUser)
        throw new ApiError(
            400,
            "There is no user associated with the given User id"
        );

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                // removing this pipeline would throw in all the user data
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        // To remove the extra array wrapped with
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: limit,
        },
    ]);

    if (!userTweets)
        throw new ApiError(
            500,
            "Something went wrong while fetching the tweets"
        );

    return res
        .status(200)
        .json(new ApiResponse(200, userTweets, "Tweets fetched successfully"));
});

const createTweet = asyncHandler(async (req, res) => {
    const content = req.body?.content?.trim();

    if (!content) throw new ApiError(400, "Tweet cannot be empty");
    const tweetCreate = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if (!tweetCreate)
        throw new ApiError(
            500,
            "Something went wrong while creating the tweet"
        );

    return res
        .status(200)
        .json(new ApiResponse(200, tweetCreate, "Tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!tweetId?.trim() || !isValidObjectId(tweetId))
        throw new ApiError(400, "Tweet id is empty or invalid");

    if (!content?.trim()) throw new ApiError(400, "New Tweet cannot be empty");

    // const tweetFind = await Tweet.exists({
    //     _id: new mongoose.Types.ObjectId(tweetId),
    // });
    const tweetFind = await Tweet.findById(tweetId);

    if (!tweetFind)
        throw new ApiError(404, "No tweet found with the given tweet id");

    if (tweetFind.owner?.toString() !== req.user?._id?.toString())
        throw new ApiError(
            400,
            "The requested action cannot be performed by the current user"
        );

    const tweetUpdate = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!tweetUpdate)
        throw new ApiError(
            500,
            "Something went wrong while updating the tweet"
        );

    return res
        .status(200)
        .json(new ApiResponse(200, tweetUpdate, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId?.trim() || !isValidObjectId(tweetId))
        throw new ApiError(400, "Tweet id is empty or invalid");

    const tweetFind = await Tweet.findById(tweetId);

    if (!tweetFind)
        throw new ApiError(404, "The requested Tweet doesn't exist");

    if (tweetFind.owner?.toString() !== req.user?._id?.toString())
        throw new ApiError(
            400,
            "The requested action cannot be performed by the current user"
        );

    const tweetDelete = await Tweet.findByIdAndDelete(tweetId);
    if (!tweetDelete)
        throw new ApiError(
            500,
            "Something went wrong while deleting the Tweet"
        );

    return res
        .status(200)
        .json(new ApiResponse(200, tweetDelete, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
