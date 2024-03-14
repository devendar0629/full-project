import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controller.js";

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/:commentId").delete(deleteComment).patch(updateComment);

export default router;
