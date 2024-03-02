import {
    CLOUDINARY_THUMBNAIL_FOLDER,
    CLOUDINARY_VIDEO_FOLDER,
} from "../constants.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFile } from "../utils/cloudinary.js";

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
        isPublished,
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
    const newThumbnailLocalPath = req.file?.path;
    const { description, title } = req.body;

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
});

export { uploadNewVideo, updateVideo };
