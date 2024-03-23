import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // Views are not possible without view model

    let subscriberCount = await Subscription.countDocuments({
        channel: new mongoose.Types.ObjectId(req.user?._id),
    });

    if (!subscriberCount)
        throw new ApiError(
            500,
            "Something went wrong while fetching the subscribers"
        );

    let totalLikes = await Video.aggregate([
        {
            // get user videos
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $project: {
                _id: 1,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes",
                },
            },
        },
        {
            $group: {
                _id: null,
                likes: {
                    $sum: "$likes",
                },
            },
        },
    ]);

    if (!totalLikes)
        throw new ApiError(
            500,
            "Something went wrong while fetching total likes"
        );

    let videosCount = await Video.countDocuments({
        owner: new mongoose.Types.ObjectId(req.user?._id),
    });

    if (!videosCount)
        throw new ApiError(
            500,
            "Something went wrong while fetching the videos count"
        );

    totalLikes = totalLikes[0]?.likes;

    let channelStats = {
        subscriberCount,
        videosCount,
        totalLikes,
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelStats,
                "Channel stats fetched successfully"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10 } = req.query;

    // if page is NaN or less than 0 , set it to default -> 1
    page = isNaN(page) || parseInt(page) <= 0 ? 1 : parseInt(page);

    // if limit is NaN or less than 0 , set it to default -> 10
    limit = isNaN(limit) || parseInt(limit) <= 0 ? 10 : parseInt(limit);

    const uploadedVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $project: {
                owner: 0,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likedVideos",
                pipeline: [
                    {
                        $project: { _id: 1 },
                    },
                ],
            },
        },
        {
            $addFields: {
                likes: {
                    $size: "$likedVideos",
                },
            },
        },
        {
            $project: {
                likedVideos: 0,
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

    if (!uploadedVideos)
        throw new ApiError(
            400,
            "Something went wrong while fetching uploaded videos"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                uploadedVideos,
                "Uploaded videos fetched successfully"
            )
        );
});

export { getChannelStats, getChannelVideos };
