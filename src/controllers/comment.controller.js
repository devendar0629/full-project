import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

// TODO
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { message } = req.body;

    if (!videoId?.trim() || !isValidObjectId(videoId))
        throw new ApiError(400, "Video id is invalid or empty");

    if (!message) throw new ApiError(400, "Comment cannot be empty");

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
    const { newMessage } = req.body;

    if (!newMessage) throw new ApiError(400, "Comment can't be empty");

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
                content: newMessage,
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

    // TODO : Review this
    if (commentFind.commentedBy?.toString() !== req.user?._id?.toString()) {
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
