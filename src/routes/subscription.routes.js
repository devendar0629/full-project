import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

import {
    getUserChannelSubscribers,
    toggleSubscription,
    getSubscribedChannels,
} from "../controllers/subscription.controller.js";

router.route("/:channelId").get(getSubscribedChannels).post(toggleSubscription);

router.route("/:subscriberId").get(getUserChannelSubscribers);

export default router;
