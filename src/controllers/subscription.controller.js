import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { isValidObjectId } from "mongoose";

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

    const isAlreadySubscribed = await Subscription.find({
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

// TODO
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId?.trim() || !isValidObjectId(channelId))
        throw new ApiError(400, "Channel id is either empty or invalid");
});

// TODO
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
