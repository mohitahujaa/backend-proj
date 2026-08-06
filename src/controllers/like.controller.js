import { ApiError } from "../utils/ApiError.js"
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.models.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteVideoLike } from "../utils/videoDeletion.js";
import { deleteCommentLike } from "../utils/videoDeletion.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!(mongoose.Types.ObjectId.isValid(videoId))) throw new ApiError(404, "Invalid video url");

    const videoExists = await Video.findById(videoId).select("_id").lean();
    if (!videoExists) throw new ApiError(404, "Invalid video url");

    const userId = req.user?._id;

    const isLiked = await Like.findOne({ likedBy: userId, targetId: videoId, targetType: "Video" }).select("_id").lean();

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        if (!isLiked) {
            const [response] = await Like.create([
                {
                    likedBy: userId,
                    targetId: videoId,
                    targetType: "Video"
                }
            ],
                { session }
            );

            if (!response) throw new ApiError(500, "Unable to like this video right now")
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
            if (!incVideoLikes) throw new ApiError(500, "Unable to like the video at the moment")

            await session.commitTransaction();

            return res
                .status(200)
                .json(new ApiResponse(200, "Video liked", {
                    isLiked: true,
                    likeCount: incVideoLikes.likes,
                }))

        } else {
            const decVideoLikes = await deleteVideoLike(isLiked._id, videoId, session);
            await session.commitTransaction();

            return res
                .status(200)
                .json(new ApiResponse(200, "Video unliked", {
                    isLiked: false,
                    likeCount: decVideoLikes.likes,
                }));

        }
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, error.message || "Unable to toggle Like functionality");
    } finally {
        await session.endSession()
    }

})

const toggleComentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!(mongoose.Types.ObjectId.isValid(commentId))) throw new ApiError(404, "No such comment exists");

    const commentExists = await Comment.findById(commentId).select("_id").lean();
    if (!commentExists) throw new ApiError(404, "No such comment exists");

    const userId = req.user?._id;

    const isLiked = await Like.findOne({ likedBy: userId, targetId: commentId, targetType: "Comment" }).select("_id").lean();

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        if (!isLiked) {
            const [response] = await Like.create([
                {
                    likedBy: userId,
                    targetId: commentId,
                    targetType: "Comment"
                }
            ],
                { session }
            );
            if (!response) throw new ApiError(500, "Unable to like this comment right now")

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
            if (!incCommentLikes) throw new ApiError(500, "Unable to like the comment at the moment")

            await session.commitTransaction();

            return res
                .status(200)
                .json(new ApiResponse(200, "Comment liked", {
                    isLiked: true,
                    likeCount: incCommentLikes.likes,
                }))

        } else {

            const decCommentLikes = await deleteCommentLike(isLiked._id, commentId, session);
            await session.commitTransaction();

            return res
                .status(200)
                .json(new ApiResponse(200, "Comment unliked", {
                    isLiked: false,
                    likeCount: decCommentLikes.likes,
                }));

        }
    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(500, error.message || "Unable to toggle Like functionality");
    } finally {
        await session.endSession()
    }

})

const getLikedVideos = asyncHandler(async (req, res) => {

    const page = req.query.page;
    const limit = req.query.limit;

    const userId = req.user?._id;

    const aggregate = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                targetType: "Video"
            }
        },
        {
            $sort: {
                updatedAt: -1,
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "targetId",
                foreignField: "_id",
                as: "video",
                pipeline: [{
                    $project: {
                        title: 1,
                        thumbnail: 1,
                        owner: 1,
                        "videoFile.mp4": 1,
                        duration: 1,
                        views: 1,
                        likes: 1,
                        comments: 1,
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                            {
                                $project: {
                                    username: 1,
                                    "avatar.url": 1,
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: "$owner"
                }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $addFields: {
                "video.likedAt": "$updatedAt"
            }
        },
        {
            $replaceRoot: {
                newRoot: "$video"
            }
        }
    ])

    const likedVidoes = await Like.aggregatePaginate(aggregate, {
        page,
        limit
    });

    return res
        .status(200)
        .json(new ApiResponse(200, "Vidoees fetched successfully", likedVidoes));
})

export { toggleVideoLike, toggleComentLike, getLikedVideos }