import { Router } from "express";
import { getHealth } from "../controllers/healthcheck.controller";

const router = Router();

router.route("/").get(getHealth);

export default router;
