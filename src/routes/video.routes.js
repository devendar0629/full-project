import { Router } from "express";
import { multerUpload } from "../middlewares/multer.middleware.js";
import {
    getVideoById,
    updateVideo,
    uploadNewVideo,
    deleteVideoById,
    togglePublishStatus,
    getAllVideos,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").get(getAllVideos);

router.route("/upload").post(
    multerUpload.fields([
        {
            name: "video",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    uploadNewVideo
);

router
    .route("/:videoId")
    .patch(multerUpload.single("newThumbnail"), updateVideo)
    .get(getVideoById)
    .delete(deleteVideoById);

router.route("/:videoId/togglePublishStatus").post(togglePublishStatus);

export default router;
