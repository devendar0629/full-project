import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

import {
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashboard.controller.js";

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
