import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteCloudinaryFile, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";

const uploadVideo = asyncHandler( async (req, res) => {
    const { title, description } = req.body;
    const localFilePath = req.file?.path;
    if(!localFilePath) throw new ApiError(400, "No file specified");

    if(!title.trim() || !description.trim()) throw new ApiError(400, "Title and Description are required");
    console.log(req.file);

    const response = await uploadOnCloudinary(localFilePath, { resType: "video", folder: "videos"});
    console.log(response);
    if(!response) throw new ApiError(500, "Cloudinary video upload failed");

    //save to db
    let video;
 try {
       video = await Video.create({
           videoFile: {
               mp4: response.secure_url,
               hls: response.playback_url,
               public_id: response.public_id,
           },
           title,
           description,
           duration: response.duration,
           bytes: response.bytes,
           format: response.format,
           resolution: {
            width: response.width,
            height: response.height
           },
           owner: req.user?._id,
       })

 } catch (error) {
    console.log(error);
    await deleteCloudinaryFile(response.public_id);

    throw new ApiError(500, "Unable to upload video");
 }

    return res
    .status(201)
    .json( new ApiResponse(201, "Video uploaded successfully", video))
})

const deleteVideo = asyncHandler(async (req, res) => {
    
    const { videoId } = req.body;
    if(!videoId) throw new ApiError(404, "video not selected");

    const video = await Video.findById(videoId);
    if(!video) throw new ApiError(404, "Video doesn't exist");

    const public_id = video?.videoFile?.public_id;

    if(!video.owner.equals(req.user?._id)) throw new ApiError(400, "Bad request!, You are not authorised");

    const vidDeleted = await deleteCloudinaryFile(public_id, { resType: "video" });
    console.log(vidDeleted);
    
    const status = vidDeleted?.deleted?.[public_id];
    console.log(status);
    if(status !== "deleted" && status !== "not_found") throw new ApiError(500, "unable to delete the file from cloudinary");

    const dataDeleted = await Video.findByIdAndDelete(video._id);
    if(!dataDeleted) throw new ApiError(500, "Unable to delete the video");

    return res
    .status(200)
    .json( new ApiResponse(200, "Video deleted successfully"));
})

export { uploadVideo, deleteVideo }