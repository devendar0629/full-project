import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
} from "../controllers/like.controller";

const router = Router();

// verify all the like routes
router.use(verifyJWT);

router.route("/toggle/video/:videoId").post(toggleVideoLike);
router.route("/toggle/tweet/:tweetId").post(toggleTweetLike);
router.route("/toggle/comment/:commentId").post(toggleCommentLike);
router.route("/videos").get(getLikedVideos);

export default router;
