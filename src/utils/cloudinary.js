import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload the file
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto'
        })

        fs.unlinkSync(localFilePath)
        // we should not expose api keys
        delete response.api_key
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the local saved temp file , as the upload operationn got failed
        return null;
    }
}

// TODO: Try this
const deleteFromCloudinary = async (cloudFileUrl) => {
    try {
        await cloudinary.api.dele
    } catch (error) {
        
    }
}

export {uploadOnCloudinary}