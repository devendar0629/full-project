import mongoose, { isValidObjectId } from "mongoose";
import {
    CLOUDINARY_THUMBNAIL_FOLDER,
    CLOUDINARY_VIDEO_FOLDER,
} from "../constants.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadFile } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    let {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "ASC",
        userId,
    } = req.query;
    const availableSortingFields = [
        "title",
        "description",
        "duration",
        "views",
        "owner",
        "createdAt",
    ];

    page = isNaN(page) || parseInt(page) <= 0 ? 1 : parseInt(page);
    limit = isNaN(limit) || parseInt(limit) <= 0 ? 10 : parseInt(limit);

    // This ensures 'asc', 'ASC', 'aSC' all are same
    sortType = sortType.toUpperCase();
    sortType = sortType != "ASC" && sortType != "DESC" ? "DESC" : sortType;
    sortType = sortType === "ASC" ? 1 : -1;

    sortBy = sortBy.trim();
    // if sortBy is not a valid field in our model, we'll default it to createdAt
    if (
        !availableSortingFields.some((type) => {
            return type === sortBy;
        })
    ) {
        sortBy = "createdAt";
    }

    const videoMatchStage = {};
    if (isValidObjectId(userId) || userId?.trim()) {
        const userExists = await User.exists({
            _id: new mongoose.Types.ObjectId(userId),
        });
        if (!userExists) {
            throw new ApiError(
                404,
                "There is no channel associated with the given user id"
            );
        }

        videoMatchStage["$match"] = {
            owner: new mongoose.Types.ObjectId(userId),
        };
    }

    if (query) {
        if (videoMatchStage.hasOwnProperty("$match")) {
            videoMatchStage["$match"] = {
                $and: [
                    { owner: new mongoose.Types.ObjectId(userId) },
                    {
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                        ],
                    },
                ],
            };
        } else {
            videoMatchStage["$match"] = {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ],
            };
        }
    }

    const removeVideoFileStage = {
        $project: {
            videoFile: 0,
        },
    };
    const joinVideoOwnerStage = {
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "videoOwner",
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
    };
    const ownerUnwrapStage = {
        $addFields: {
            videoOwner: {
                $first: "$videoOwner",
            },
        },
    };
    const sortStage = {
        $sort: {
            [sortBy]: sortType,
        },
    };
    const skipStage = {
        $skip: (page - 1) * limit,
    };
    const limitStage = {
        $limit: limit,
    };

    const aggregatePipelines = [
        removeVideoFileStage,
        joinVideoOwnerStage,
        ownerUnwrapStage,
        sortStage,
        skipStage,
        limitStage,
    ];
    if (Object.keys(videoMatchStage).length !== 0)
        aggregatePipelines.splice(0, 0, videoMatchStage);

    const videos = await Video.aggregate(aggregatePipelines);

    if (!videos) {
        throw new ApiError(
            500,
            "Something went wrong while fetching the videos"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

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

    const videoCreate = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: Math.round(video.duration),
        isPublished, // check if set correctly
        owner: req.user,
    });
    if (!videoCreate)
        throw new ApiError(
            500,
            "Something went wrong while uploading the video"
        );

    const videoDocument = await Video.findById(videoCreate._id).select(
        "-owner -videoFile"
    );
    if (!videoDocument)
        throw new ApiError(
            500,
            "Something went wrong while retrieving the uploaded video"
        );

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
        const deleteOldThumbnail = await deleteFromCloudinary(
            videoExists.thumbnail
        );
        if (!deleteOldThumbnail)
            throw new ApiError(
                500,
                "Something went wrong while deleting old thumbnail"
            );

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
    ).select("-owner -videoFile");

    if (!updatedVideo) {
        throw new ApiError(500, "Error while updating the video");
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo));
});

// This is the api to watch a video
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId?.trim() || !mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Video Id is required or invalid");

    const videoExists = await Video.exists({
        _id: new mongoose.Types.ObjectId(videoId),
    });
    if (!videoExists)
        throw new ApiError(404, "No video found with the given video id");

    const reqVideo = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
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
                views: {
                    $add: [0, "$views"],
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "videoOwner",
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
        {
            $unwind: {
                path: "$videoOwner",
            },
        },
    ]);

    const updateVideoView = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                views: reqVideo[0].views + 1,
            },
        },
        {
            new: true,
        }
    );
    if (!updateVideoView)
        throw new ApiError(
            500,
            "Something went wrong while updating the like count"
        );

    return res
        .status(200)
        .json(
            new ApiResponse(200, updateVideoView, "Video fetched successfully")
        );
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
        .status(204)
        .json(new ApiResponse(204, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId?.trim() || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id is required or invalid");
    }

    const videoDocument = await Video.findById(videoId).select("-videoFile");

    if (!videoDocument) {
        throw new ApiError(500, "The requested video doesn't exist");
    }

    videoDocument.isPublished = !videoDocument.isPublished;
    const resp = await videoDocument.save();
    if (!resp)
        throw new ApiError(
            500,
            "Something went wrong while updating publish status"
        );

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
    getAllVideos,
};
