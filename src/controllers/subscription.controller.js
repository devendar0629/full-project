import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    // Channel id is also an userid
    const { channelId } = req.params;

    if (!isValidObjectId(channelId) || !channelId?.trim())
        throw new ApiError(400, "Channel id is invalid or empty");

    const channelFind = await User.findById(channelId);

    if (!channelFind)
        throw new ApiError(
            400,
            "There is no channel associated with the channel id"
        );

    const isAlreadySubscribed = await Subscription.exists({
        channel: channelFind._id,
        subscriber: req.user?._id,
    });

    let finalSubscriptionStatus;
    if (!isAlreadySubscribed) {
        const subscriptionCreate = await Subscription.create({
            channel: channelFind._id,
            subscriber: req.user?._id,
        });

        if (!subscriptionCreate)
            throw new ApiError(500, "Error subscribing to the channel");

        finalSubscriptionStatus = true;
    } else {
        const subscriptionDelete = await Subscription.deleteOne({
            subscriber: req.user?._id,
            channel: channelFind._id,
        });

        if (!subscriptionDelete)
            throw new ApiError(500, "Error Unsubscribing to the channel");

        finalSubscriptionStatus = false;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                finalSubscriptionStatus
                    ? "Channel subscribed successfully"
                    : "Channel Unsubscribed successfully"
            )
        );
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId?.trim() || !isValidObjectId(channelId))
        throw new ApiError(400, "Channel id is either empty or invalid");

    const channelFind = await User.exists({
        _id: new mongoose.Types.ObjectId(channelId),
    });

    if (!channelFind)
        throw new ApiError(404, "No channel found with the given id");

    const userSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            avatar: 1,
                            fullName: 1,
                            username: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscriber: {
                    $first: "$subscriber",
                },
            },
        },
        {
            $project: {
                // TODO : Test to include a field that is only removed and the rest are passed , instead of specifying which fields are required
                _id: 0,
                // subscriber: 1,
                createdAt: 1,
                updatedAt: 1,
                subscriber: 1,
            },
        },
        {
            $replaceRoot: {
                newRoot: "$subscriber",
            },
        },
    ]);

    if (!userSubscribers)
        throw new ApiError(
            500,
            "Something went wrong while fetching the subscribers"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                userSubscribers,
                "Subscribers fetched successfuly"
            )
        );
});

// TODO
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $project: {
                channel: 1,
                _id: 0,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            _id: 0,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel",
                },
            },
        },
        {
            $replaceRoot: {
                newRoot: "$channel",
            },
        },
    ]);

    if (!subscribedChannels)
        throw new ApiError(400, "Error while fetching subscribed channels");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully"
            )
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
