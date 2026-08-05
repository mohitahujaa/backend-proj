import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from 'mongoose';


const doComment = asyncHandler(async (req, res) => {

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { text } = req.body;
        const { videoId } = req.params;

        if (!text?.trim()) throw new ApiError(400, "No text provided for the comment");
        if (!videoId) throw new ApiError(400, "Invalid video url");

        if (!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid video url")

        if (text.length > 10000) throw new ApiError(400, "A comment can only be upto ten thousand characters");

        const [addedComment] = await Comment.create([{
            text,
            targetId: videoId,
            targetType: "Video",
            author: req.user._id
        }],
            {
                session
            }
        )
        if (!addedComment) throw new ApiError(500, "Unable to add the comment at the moment");

        const incVidCommentCnt = await Video.findByIdAndUpdate(videoId, {
            $inc: {
                comments: 1
            }
        },
            {
                new: true,
                session
            }
        );
        if (!incVidCommentCnt) throw new ApiError(500, "Unable to add the comment at the moment");

        const commentCnt = incVidCommentCnt.comments;

        await session.commitTransaction();
        return res
            .status(200)
            .json(new ApiResponse(200, "Comment added to the video", { addedComment, commentCnt }));

    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, error.message || "Unable to add the comment at the moment");

    } finally {
        await session.endSession();
    }
})

const deleteComment = asyncHandler(async (req, res) => {

    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const { commentId } = req.params
        if (!commentId?.trim()) throw new ApiError(404, "Comment does not exist");

        if (!mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(404, "Comment does not exist");

        //check if the comment exists 
        const comment = await Comment.findById(commentId).select("author targetId targetType").session(session).lean();
        if (!comment) throw new ApiError(404, "Comment does not exist");

        //verify the owner
        const isOwner = comment.author.equals(req.user?._id);
        if (!isOwner) throw new ApiError(403, "You are not authorised to perform this action");

        const videoId = comment.targetId;
        const decVideoCommentCnt = await Video.findByIdAndUpdate(videoId,
            {
                $inc: {
                    comments: -1
                }
            },
            {
                new: true,
                session
            }
        )
        if (!decVideoCommentCnt) throw new ApiError(500, "Something went wrong while deleting this comment");

        const isDeleted = await Comment.findByIdAndDelete(commentId, { session });
        if (!isDeleted) throw new ApiError(500, "Something went wrong while deleting this comment");

        await session.commitTransaction();

        return res
            .status(200)
            .json(new ApiResponse(200, "Comment deleted", {
                success: true,
                comments: decVideoCommentCnt.comments,
            }));

    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(error.statusCode || 500, error.message || "Something went wrong while deleting the comment");

    } finally {
        await session.endSession();
    }

});

const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    if(!videoId) throw new ApiError(404, "Invalid video url");
    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(404, "Invalid video url");

    //check if video exists
    const videoExists = Video.findById(videoId).select("_id").lean();
    if(!videoExists) return new ApiError(404, "Video not found");

    const comments = await Comment.aggregate([
        {
            $match: {
                targetId: new mongoose.Types.ObjectId(videoId),
                targetType: "Video"
            }
        },
        {
            $sort: {
                createdAt: -1, //newest at the top
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "author",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$author"
        },
        {
            $project: {
                _id: 1,
                text: 1,
                author: 1,
                likes: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ])

    return res
    .status(200)
    .json( new ApiResponse(200, "Comments fetched successfully", comments))
    
})

const toggleComentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!(mongoose.Types.ObjectId.isValid(commentId)))throw new ApiError(404, "No such comment exists");

    const commentExists = await Comment.findById(commentId).select("_id").lean();
    if(!commentExists) throw new ApiError(404, "No such comment exists");

    const userId = req.user?._id;

    const isLiked = await Like.findOne({likedBy: userId, targetId: commentId, targetType: "Comment"}).select("_id").lean();
    
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        
        if(!isLiked){
            const [response] = await Like.create([
                    {
                    likedBy: userId,
                    targetId: commentId,
                    targetType: "Comment"
                    }
                ],
                {session}
            );
            if(!response) throw new ApiError(500, "Unable to like this comment right now")

            const incCommentLikes = await Comment.findByIdAndUpdate(response.targetId, 
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
            if(!incCommentLikes) throw new ApiError(500, "Unable to like the comment at the moment")

            await session.commitTransaction();

            return res
            .status(200)
            .json( new ApiResponse(200, "Comment liked", {
                isLiked : true,
                likeCount: incCommentLikes.likes,
            }))

        }else{
            
            const isDeleted = await Like.findByIdAndDelete(isLiked._id, { session });
            if(!isDeleted) throw new ApiError(500, "Unable to find the liked document");

            const decCommentLikes = await Comment.findByIdAndUpdate(commentId, 
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
            
            if(!decCommentLikes) throw new ApiError(500, "Unable to unlike this comment at the moment");

            await session.commitTransaction();

            return res
            .status(200)
            .json( new ApiResponse(200, "Comment unliked", {
                isLiked : false,
                likeCount: decCommentLikes.likes,
            }));
            
        }
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, error.message || "Unable to toggle Like functionality");
    } finally{
        await session.endSession()
    }
    
})

export { doComment, toggleComentLike, deleteComment, getVideoComments };