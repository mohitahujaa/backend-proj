import { ApiError } from "../utils/ApiError.js"
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

// const doLIke = async (
//     {
//         userId,
//         targetId,
//         targetType
//     } = {}
// ) => {
//     if(targetType == "like"){
//         const response = await Like.create({
//             likeBy: userId,
//             targetId,
//             targetType
//         });


//     }
// }

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!(mongoose.Types.ObjectId.isValid(videoId)))throw new ApiError(404, "Invalid video url");

    const videoExists = await Video.findById(videoId).select("_id").lean();
    if(!videoExists) throw new ApiError(404, "Invalid video url");

    const userId = req.user?._id;

    const isLiked = await Like.findOne({likedBy: userId, targetId: videoId, targetType: "Video"}).select("_id").lean();
    
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        
        if(!isLiked){
            const [response] = await Like.create([
                    {
                    likedBy: userId,
                    targetId: videoId,
                    targetType: "Video"
                    }
                ],
                {session}
            );

            if(!response) throw new ApiError(500, "Unable to like this video right now")
            const incVideoLikes = await Video.findByIdAndUpdate(response.targetId, 
                {
                    $inc: {
                        likes: 1
                    }
                },
                {
                    new: true,
                    session
                }
            )
            if(!incVideoLikes) throw new ApiError(500, "Unable to like the video at the moment")

            await session.commitTransaction();

            return res
            .status(200)
            .json( new ApiResponse(200, "Video liked", {
                isLiked : true,
                likeCount: incVideoLikes.likes,
            }))

        }else{
            
            const isDeleted = await Like.findByIdAndDelete(isLiked._id, { session });
            if(!isDeleted) throw new ApiError(500, "Unable to find the liked document");

            const decVideoLikes = await Video.findByIdAndUpdate(videoId, 
                {
                    $inc: {
                        likes: -1
                    }
                },
                {
                    new: true,
                    session
                }
            );
            
            if(!decVideoLikes) throw new ApiError(500, "Unable to unlike this video at the moment");

            await session.commitTransaction();

            return res
            .status(200)
            .json( new ApiResponse(200, "Video unliked", {
                isLiked : false,
                likeCount: decVideoLikes.likes,
            }));
            
        }
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, error.message || "Unable to toggle Like functionality");
    } finally{
        await session.endSession()
    }
    
})

export { toggleVideoLike }