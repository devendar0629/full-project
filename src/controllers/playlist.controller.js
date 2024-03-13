import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    //TODO: get user playlists
});

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name?.trim() || !description?.trim())
        throw new ApiError(400, "Fields name and description are required");

    const playlistCreate = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    if (!playlistCreate)
        throw new ApiError(500, "Error while creating playlist");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistCreate,
                "Playlist created successfully"
            )
        );
});

// TODO
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist id is either invalid or empty");
    }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !playlistId?.trim())
        throw new ApiError(400, "Playlist id is invalid or empty");
    if (!isValidObjectId(videoId) || !videoId?.trim())
        throw new ApiError(400, "Video id is invalid or empty");

    const playlistFind = await Playlist.findById(playlistId);
    if (!playlistFind) throw new ApiError(404, "Playlist not found");

    const videoFind = await Video.findById(videoId);
    if (!videoFind) throw new ApiError(404, "Video not found");

    if (playlistFind.owner?.toString() !== req.user?._id?.toString())
        throw new ApiError(
            400,
            "The requested action cannot be performed by the current user"
        );

    // Check working
    const videoExistInPlaylist = playlistFind.videos.findIndex(
        (vidId) => vidId.toString() === videoFind._id?.toString()
    );

    // video doesn't exist in playlist
    if (videoExistInPlaylist === -1) {
        playlistFind.videos.push(videoId);
        const playlistSave = await playlistFind.save();
        if (!playlistSave)
            throw new ApiError(
                500,
                "Something went wrong while adding video to the playlist"
            );
    } else throw new ApiError(400, "Video already exists in the playlist");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistFind,
                "Video added to playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !playlistId?.trim())
        throw new ApiError(400, "Playlist id is invalid or empty");
    if (!isValidObjectId(videoId) || !videoId?.trim())
        throw new ApiError(400, "Video id is invalid or empty");

    const playlistFind = await Playlist.findById(playlistId);
    if (!playlistFind) throw new ApiError(404, "Playlist not found");

    const videoFind = await Video.findById(videoId);
    if (!videoFind) throw new ApiError(404, "Video not found");

    if (playlistFind.owner?.toString() !== req.user?._id?.toString())
        throw new ApiError(
            400,
            "The requested action cannot be performed by the current user"
        );

    // Check working
    playlistFind.videos = playlistFind.videos.filter(
        (vid) => vid._id?.toString() !== videoId?.toString()
    );

    const savePlaylist = await playlistFind.save();
    if (!savePlaylist)
        throw new ApiError(500, "Error while removing the video from playlist");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistFind,
                "Video removed from playlist successfully"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist id is either invalid or empty");
    }

    const playlistCheck = await Playlist.findById(playlistId);

    if (!playlistCheck) throw new ApiError(404, "PLaylist not found");

    if (playlistCheck._id?.owner?.toString() !== req.user?._id?.toString())
        throw new ApiError(
            400,
            "The requested action cannot be performed by the current user"
        );

    const playlistDelete = await Playlist.findByIdAndDelete(playlistId);

    if (!playlistDelete)
        throw new ApiError(500, "Error while deleting the playlist");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlistDelete,
                "Playlist deleted successfully"
            )
        );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!name?.trim() || !description?.trim())
        throw new ApiError(400, "Name and Description cannot be empty");
    if (!isValidObjectId(playlistId) || !playlistId?.trim())
        throw new ApiError(400, "Playlist id either invalid or empty");

    const playlistFind = await Playlist.findById(playlistId);

    if (!playlistFind) throw new ApiError(404, "Playlist not found");

    const playlistUpdate = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            },
        },
        { new: true }
    );

    if (!playlistUpdate)
        throw new ApiError(500, "Error while updating the playlist");

    return res.status(200).json(new ApiResponse(200, playlistUpdate));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
