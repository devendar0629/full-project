import mongoose from "mongoose";
import {
    CLOUDINARY_THUMBNAIL_FOLDER,
    CLOUDINARY_VIDEO_FOLDER,
} from "../constants.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadFile } from "../utils/cloudinary.js";

const uploadNewVideo = asyncHandler(async (req, res) => {
    /*
        => get video and thumbnail localpaths
        => check if empty
        => extract title and description
        => check if empty
        => upload video and thumbnail on cloudinary
        => check for any errors
        => create the video document in DB
        => check for error
        => return success response
    */

    let videoLocalPath = null;
    if (req.files && req.files.video && req.files.video.length > 0) {
        videoLocalPath = req.files.video[0].path;
    }

    let thumbnailLocalPath = null;
    if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path;
    }

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "Video and thumbnail are required");
    }

    const { title, description, isPublished = true } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and Description are required");
    }

    // const video = await uploadVideo(videoLocalPath,CLOUDINARY_VIDEO_FOLDER)
    const video = await uploadFile(videoLocalPath, CLOUDINARY_VIDEO_FOLDER);
    const thumbnail = await uploadFile(
        thumbnailLocalPath,
        CLOUDINARY_THUMBNAIL_FOLDER
    );

    if (!video) {
        throw new ApiError(500, "Error while uploading video");
    }

    if (!thumbnail) {
        throw new ApiError(500, "Error while uploading thumbnail");
    }

    const videoDocument = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: Math.round(video.duration),
        isPublished, // check if set correctly
        owner: req.user,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, videoDocument, "Video uploaded successfully")
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId?.trim() || !mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Video Id is required or invalid");

    const newThumbnailLocalPath = req.file?.path;
    const { description, title } = req.body;

    const videoExists = await Video.findById(videoId);

    if (!videoExists) {
        throw new ApiError(400, "The video with given id does not exist");
    }

    if (!description || !title) {
        throw new ApiError(400, "Description and title cannot be empty");
    }

    const updatedVideoData = {
        title,
        description,
    };

    if (newThumbnailLocalPath) {
        const newThumbnail = await uploadFile(
            newThumbnailLocalPath,
            CLOUDINARY_THUMBNAIL_FOLDER
        );
        if (!newThumbnail) {
            throw new ApiError(500, "Error while uploading thumbnail");
        }
        updatedVideoData.thumbnail = newThumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updatedVideoData,
        },
        {
            new: true,
        }
    ).select("-owner");

    if (!updatedVideo) {
        throw new ApiError(500, "Error while updating the video");
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId?.trim() || !mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Video Id is required or invalid");

    const reqVideo = await Video.findById(videoId).select("-owner");

    if (!reqVideo) {
        throw new ApiError(400, "Invalid video id");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, reqVideo, "Video fetched successfully"));
});

const deleteVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId?.trim() || !mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Video id is required");

    const videoDocument = await Video.findById(videoId);
    if (!videoDocument) {
        throw new ApiError(
            400,
            "The video with the associated id does not exist"
        );
    }

    const videoUrl = videoDocument.videoFile;
    const thumbnailUrl = videoDocument.thumbnail;

    const videoDelete = await deleteFromCloudinary(videoUrl);
    const thumbnailDelete = await deleteFromCloudinary(thumbnailUrl);

    if (!videoDelete || !thumbnailDelete) {
        throw new ApiError(
            500,
            "Something went wrong while deleting video or thumbnail"
        );
    }

    const videoDocumentDelete = await Video.deleteOne({
        _id: new mongoose.Types.ObjectId(videoDocument._id),
    });

    if (!videoDocumentDelete) {
        throw new ApiError(
            500,
            "Something went wrong while deleting the video"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId?.trim() || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id is required or invalid");
    }

    const videoDocument = await Video.findById(videoId);

    if (!videoDocument) {
        throw new ApiError(500, "The requested video doesn't exist");
    }

    videoDocument.isPublished = !videoDocument.isPublished;
    const resp = await videoDocument.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videoDocument,
                "Updated publish status successfully"
            )
        );
});

export {
    uploadNewVideo,
    updateVideo,
    getVideoById,
    deleteVideoById,
    togglePublishStatus,
};
