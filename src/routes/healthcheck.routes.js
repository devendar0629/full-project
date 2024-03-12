import { Router } from "express";

const router = Router();

import { getHealth } from "../controllers/healthcheck.controller.js";

router.route("/").get(getHealth);

export default router;
