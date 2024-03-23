import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js";

router.route("/").post(createPlaylist).get(getUserPlaylists);

router
    .route("/:playlistId")
    .delete(deletePlaylist)
    .get(getPlaylistById)
    .patch(updatePlaylist);

router.route("/add/:videoId/:playlistId").post(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").post(removeVideoFromPlaylist);

export default router;
