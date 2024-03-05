import { Video } from "../models/video.model.js";
import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    //TODO: toggle like on comment
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
