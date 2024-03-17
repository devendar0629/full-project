import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

import {
    getUserChannelSubscribers,
    toggleSubscription,
    getSubscribedChannels,
} from "../controllers/subscription.controller.js";

router
    .route("/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription);

router.route("/").get(getSubscribedChannels);

export default router;
