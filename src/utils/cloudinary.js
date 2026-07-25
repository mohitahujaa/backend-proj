import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload a file
const uploadOnCloudinary = async (localFilePath) => {

    try{
        if(!localFilePath) return null

    const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
    })

    console.log("File has been uploaded on cloudinary successfully", response.url)
    return response;

    } catch(error){
        console.log("Cloudinary upload failed", error.message);
        return null;

    } finally{
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath) 
            // remove the locally saved temporary file if op got failed
        }
    }

}

const deleteCloudinaryFile = async(publicId) => {
    try {
        if(!publicId) throw (404, "Image not selected for deletion");

        const response = await cloudinary.api.delete_resources([publicId]);
        if(!response) throw(500, "Something went wrong while deleting the file");

        console.log("File has been deleted from cloudinary");
        return response;

    } catch (error) {
        console.log("Cloudinary deletion failed", error.message);
        return null;
    }
}

export { uploadOnCloudinary, deleteCloudinaryFile }