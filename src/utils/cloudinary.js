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

    console.log("File has been uploaded on cloudinarysuccessfully", response.url)
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

export { uploadOnCloudinary }