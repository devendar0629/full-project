import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model";

// TODO
const getUserTweets = asyncHandler(async (req, res) => {});

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

    if (tweetId.owner?.toString() !== req.user?._id?.toString())
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
