import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload a file
const uploadOnCloudinary = async (localFilePath,
        {
            resType = "auto",
            folder
        } = {}
) => {

    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: resType || "auto",
            folder: folder || "Home"
        })

        console.log("File has been uploaded on cloudinary successfully", response.url)
        return response;

    } catch (error) {
        console.log("Cloudinary upload failed", error.message);
        return null;

    } finally {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)
            // remove the locally saved temporary file if op got failed
        }
    }

}

const deleteCloudinaryFile = async (publicId,{
    resType = "image",
    retries = 3,
} = {}) => {
    try {
        if (!publicId) throw (404, "Image not selected for deletion");

        
        for(let i = 0; i < retries; i++){
            try {
                const response = await cloudinary.api.delete_resources([publicId], { resource_type : resType});
                if(response) return response;
            } catch (error) {
                console.log(error);
            }

            await new Promise(resolve => setTimeout(resolve, 1000 * (2**i)));
        }

        return false;

    } catch (error) {
        console.log("Cloudinary deletion failed", error.message);
        return null;
    }
}

// const deleteWithRetry = async (publicId, retries = 3) => {
//     for (let i = 0; i < retries; i++) {
//         try {
//             const deleted = await deleteCloudinaryFile(publicId);
//             if (deleted) return true
//         } catch (error) {
//             console.log(error)
//         }

//         await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** i)));
//     }

//     return false
// }

export { uploadOnCloudinary, deleteCloudinaryFile }