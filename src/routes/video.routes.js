import { Router } from "express";
import { multerUpload } from '../middlewares/multer.middleware.js'
import { uploadNewVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/upload").post(
    verifyJWT,
    multerUpload.fields([
        {
            name:"video",
            maxCount:1
        },
        {
            name:"thumbnail",
            maxCount:1
        }
    ]),
    uploadNewVideo
)

router.route("/update").post(
    verifyJWT,
    multerUpload.single("newThumbnail")
)

export default router