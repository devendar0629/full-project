import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getPublicIdFromUrl = (cloudinaryUrl) => {
    // http://res.cloudinary.com/juniorcloud/image/upload/v1709466179/thumbnails/nzmo5kcuv7ymw1hakky4.jpg
    // public id : thumbnails/nzmo5kcuv7ymw1hakky4

    let lastSecondSlash = null;
    let slashCount = 0;
    for (let i = cloudinaryUrl.length; i >= 0; i--) {
        if (cloudinaryUrl.charAt(i) == "/") slashCount++;
        if (slashCount == 2) {
            lastSecondSlash = i;
            break;
        }
    }

    let extensionDot = cloudinaryUrl.lastIndexOf(".");
    let publicId = cloudinaryUrl.substring(lastSecondSlash + 1, extensionDot);

    return publicId;
};

// TODO: Create a new function that uploads videos optimized and faster
const uploadFile = async (localFilePath, folderName = "") => {
    try {
        if (!localFilePath) return null;
        // upload the file
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folderName,
        });

        if (!response) {
            return null;
        }

        fs.unlinkSync(localFilePath);

        // we should not expose api keys
        delete response.api_key;
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the local saved temp file , as the upload operation got failed for now , in future we'll try to upload the failed ones
        return null;
    }
};

// TODO: Try this
const deleteFromCloudinary = async (cloudinaryUrl) => {
    try {
        const publicId = getPublicIdFromUrl(cloudinaryUrl);
        return await cloudinary.api.delete_resources([publicId]);
    } catch (error) {
        console.log("Error: ", error);
    }
};

export { uploadFile, deleteFromCloudinary, getPublicIdFromUrl };
