import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    let { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId) || !videoId?.trim())
        throw new ApiError(400, "Video id is either invalid or empty");

    // if page is NaN or less than 0 , set it to default -> 1
    page = isNaN(page) || parseInt(page) <= 0 ? 1 : parseInt(page);

    // if limit is NaN or less than 0 , set it to default -> 10
    limit = isNaN(limit) || parseInt(limit) <= 0 ? 10 : parseInt(limit);

    const videoExists = await Video.exists({
        _id: new mongoose.Types.ObjectId(videoId),
    });

    if (!videoExists)
        throw new ApiError(404, "No video found with the given video id");

    const videoComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commenter",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                commenter: {
                    $first: "$commenter",
                },
            },
        },
        // Following two pipelines are to merge the commenter object to the root , so it can be accessed easily
        {
            $addFields: {
                username: "$commenter.username",
                fullName: "$commenter.fullName",
                avatar: "$commenter.avatar",
            },
        },
        {
            $project: {
                _id: 0,
                commenter: 0,
            },
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: limit,
        },
    ]);

    if (!videoComments)
        throw new ApiError(
            500,
            "Something went wrong while fetching video comments"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoComments,
                "Video comments fetched successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { message } = req.body;

    if (!videoId?.trim() || !isValidObjectId(videoId))
        throw new ApiError(400, "Video id is invalid or empty");

    if (!message) throw new ApiError(400, "Comment cannot be empty");

    const videoFind = await Video.findById(videoId);

    if (!videoFind) throw new ApiError(404, "No video found with the given id");

    const commentCreate = await Comment.create({
        owner: req.user?._id,
        video: videoId,
        content: message.trim(),
    });

    if (!commentCreate)
        throw new ApiError(500, "Something went wrong while commenting");

    return res
        .status(200)
        .json(
            new ApiResponse(200, commentCreate, "Comment created successfully")
        );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { message } = req.body;

    if (!message) throw new ApiError(400, "Comment can't be empty");

    if (!commentId?.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment id is missing or invalid");
    }

    const commentFind = await Comment.findById(commentId);

    if (!commentFind)
        throw new ApiError(404, "The requested comment doesn't exist");

    if (commentFind.owner?.toString() !== req.user?._id?.toString())
        throw new ApiError(
            400,
            "The requested action cannot be performed by current user"
        );

    const update = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: message,
            },
        },
        {
            new: true,
        }
    );

    if (!update)
        throw new ApiError(
            500,
            "Something went wrong while updating the comment"
        );

    return res
        .status(200)
        .json(new ApiResponse(200, update, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId?.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment id is missing or invalid");
    }

    const commentFind = await Comment.findById(commentId);

    if (!commentFind)
        throw new ApiError(404, "The requested comment doesn't exist");

    if (commentFind.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(
            401,
            "The requested action cannot be performed by the current user"
        );
    }

    const commentDelete = await Comment.findByIdAndDelete(commentId);

    if (!commentDelete)
        throw new ApiError(
            500,
            "Either the comment does not exist or Something went wrong while deleting the comment"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(200, commentDelete, "Comment deleted successfully")
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
