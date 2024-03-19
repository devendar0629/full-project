import { Video } from "../models/video.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            views: 1,
                            thumbnail: 1,
                            duration: 1,
                            videoFile: 1,
                            owner: 1,
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "uploadedBy",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                // this overwrites the previous video which was wrapped in a array
                video: {
                    $first: "$video",
                },
            },
        },
        {
            $project: {
                _id: 0,
                __v: 0,
                likedBy: 0,
                createdAt: 0,
                updatedAt: 0,
            },
        },
        {
            $replaceRoot: {
                newRoot: "$video",
            },
        },
    ]);

    if (!likedVideos)
        throw new ApiError(
            500,
            "Something went wrong while fetching liked videos"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos are fetched successfully"
            )
        );
});

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is not missing or not valid");
    }

    const videoDocument = await Video.findById(videoId);
    if (!videoDocument) {
        throw new ApiError(400, "Video does not exist");
    }

    let finalLikeStatus;
    const isLiked = await Like.findOne({
        // remember here always the id comes not the video document itself
        video: videoId,
        likedBy: req.user?._id,
    });

    // if we find a like document corresponded with the video by the user
    if (isLiked) {
        const likeDelete = await Like.deleteOne({
            video: videoId,
            likedBy: req.user?._id,
        });

        if (!likeDelete) {
            throw new ApiError(500, "Error while disliking the video");
        }

        finalLikeStatus = false;
    } else {
        const likeCreate = await Like.create({
            video: videoId,
            likedBy: req.user?._id,
        });

        if (!likeCreate) {
            throw new ApiError(500, "Error while liking the video");
        }

        finalLikeStatus = true;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                finalLikeStatus
                    ? "Liked video successfully"
                    : "Disliked video successfully"
            )
        );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId?.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment id is missing or invalid");
    }

    const commentLike = await Like.find({
        comment: commentId,
        likedBy: req.user?._id,
    });

    let finalLikeStatus;

    if (!commentLike) {
        const newLike = await Like.create({
            comment: commentId,
            likedBy: req.user?._id,
        });

        if (!newLike)
            throw new ApiError(
                500,
                "Something went wrong while liking the comment"
            );
        finalLikeStatus = true;
    } else {
        const likeDelete = await Like.deleteOne({
            comment: commentId,
            likedBy: req.user?._id,
        });

        if (!likeDelete)
            throw new ApiError(
                500,
                "Something went wrong while disliking the comment"
            );
        finalLikeStatus = false;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                finalLikeStatus
                    ? "Liked comment successfully"
                    : "Disliked comment successfully"
            )
        );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId?.trim() || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet id is missing or invalid");
    }

    const tweetLike = await Like.find({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    let finalLikeStatus;

    if (!tweetLike) {
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id,
        });

        if (!newLike)
            throw new ApiError(
                500,
                "Something went wrong while liking the tweet"
            );
        finalLikeStatus = true;
    } else {
        const likeDelete = await Like.deleteOne({
            tweet: tweetId,
            likedBy: req.user?._id,
        });

        if (!likeDelete)
            throw new ApiError(
                500,
                "Something went wrong while disliking the tweet"
            );
        finalLikeStatus = false;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                finalLikeStatus
                    ? "Liked tweet successfully"
                    : "Disliked tweet successfully"
            )
        );
});

// TODO: Add more stuff like getLikedTweets, getLikedComments, ...etc

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
