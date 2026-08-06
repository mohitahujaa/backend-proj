import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteCloudinaryFile, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import mongoose from "mongoose";
import { deleteVideoById } from "../utils/videoDeletion.js";

const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const localFilePath = req.file?.path;
    if (!localFilePath) throw new ApiError(400, "No file specified");

    if (!title.trim() || !description.trim()) throw new ApiError(400, "Title and Description are required");
    console.log(req.file);

    const response = await uploadOnCloudinary(localFilePath, { resType: "video", folder: "videos" });
    console.log(response);
    if (!response) throw new ApiError(500, "Cloudinary video upload failed");

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
        .json(new ApiResponse(201, "Video uploaded successfully", video))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { videoId } = req.params;
        if (!videoId) throw new ApiError(404, "video not selected");

        const public_id = await deleteVideoById(videoId, req.user?._id, session);
        await session.commitTransaction();

        const vidDeleted = await deleteCloudinaryFile(public_id, { resType: "video" });

        const status = vidDeleted?.deleted?.[public_id];
        if (status !== "deleted" && status !== "not_found") console.log("unable to delete the file from cloudinary");

        return res
            .status(200)
            .json(new ApiResponse(200, "Video deleted successfully", { success: true }));

    } catch (error) {
        await session.abortTransaction();
        throw new ApiError(error.statusCode || 500, error.message || "Unable to delete this video")

    } finally {
        await session.endSession();
    }
})

const watchVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!videoId) throw new ApiError(404, "Invalid video id");

    const [videoObj] = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
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
                            fullName: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "targetId",
                as: "topComment",
                pipeline: [
                    {
                        $sort: {
                            "likes": -1,
                        }
                    },
                    {
                        $limit: 1
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "author",
                            foreignField: "_id",
                            as: "author",
                            pipeline: [{
                                $project: {
                                    username: 1,
                                    fullName: 1,
                                    "avatar.url": 1,
                                }
                            },
                            ]
                        }
                    },
                    {
                        $addFields: {
                            author: {
                                $first: "$author"
                            }
                        }
                    },
                    {
                        $project: {
                            text: 1,
                            author: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                topComment: {
                    $first: "$topComment"
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                likes: 1,
                comments: 1,
                topComment: 1,
                duration: 1,
                owner: 1,
                "videoFile.mp4": 1,
                "videoFile.hls": 1,
                format: 1,
            }
        }
    ])


    //increment video views, will return the old views status
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            "views": 1
        }
    })

    const userId = req.user?._id;
    if (userId) {
        await User.findByIdAndUpdate(userId, {
            $pull: {
                watchHistory: {
                    video: videoId
                }
            }
        });

        await User.findByIdAndUpdate(userId, {
            $push: {
                watchHistory: {
                    video: videoId,
                    watchedAt: new Date(),
                }
            }
        })
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Video fetched successfully", videoObj));
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const page = req.query.page;
    const limit = req.query.limit;

    const { channelUsername } = req.params;
    if (!channelUsername) throw new ApiError(404, "Enter valid channel name");

    //check if channel exists (username is correct)
    const channelObj = await User.findOne({ username: channelUsername }).select("_id").lean();
    if (!channelObj) throw new ApiError(404, "Enter a valid channel name");
    console.log(channelObj);

    const aggregate =  Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelObj._id)
            }
        },
        {
            $sort: {
                createdAt: -1,
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                duration: 1,
                thumbnail: 1,
                format: 1,
                views: 1,
                likes: 1,
                comments: 1,
                createdAt: 1,
                "videoFile.mp4": 1,
                "videoFile.hls": 1,
            }
        }
    ])

    const videos = await Video.aggregatePaginate(aggregate,{
        page,
        limit
    }
    )
    return res
        .status(200)
        .json(new ApiResponse(200, "Videos fetched Successfully", videos));
})

const searchVideos = asyncHandler(async (req, res) => {
    const page = req.query.page;
    const limit = req.query.limit;

    const { q } = req.query;
    if (!q?.trim()) throw new ApiError(400, "Search query is required");

    const aggregate = Video.aggregate([
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
                            fullName: 1,
                            "avatar.url": 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                }
            }
        },
        {
            $match: {
                $or: [
                    {
                        title: {
                            $regex: q,
                            $options: "i",
                        }
                    },
                    {
                        description: {
                            $regex: q,
                            $options: "i",
                        }
                    },
                    {
                        "owner.fullName": {
                            $regex: q,
                            $options: "i",
                        }
                    },
                    {
                        "owner.username": {
                            $regex: q,
                            $options: "i",
                        }
                    }
                ]
            }
        },
        {
            $sort: {
                views: -1,
            }
        },
        {
            $project: {
                thumbnail: 1,
                title: 1,
                owner: 1,
                views: 1,
                likes: 1,
                comments: 1,
                "videoFile.mp4": 1,
                "videoFile.hls": 1,
                createdAt: 1,
            }
        }
    ])

    const videos = await Video.aggregatePaginate(aggregate, {
        page,
        limit
    });

    return res
        .status(200)
        .json(new ApiResponse(200, "Search query executed", videos));
})

const homePage = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    //get subscribed channels list
    if (userId) {
        const subscriptions = await Subscription.find({
            subscriber: userId
        });

        const subscribedChannelsId = subscriptions.map(s => s.channel);

        const subscribedChannelsLatestVideos = await Video.aggregate([
            {
                $match: {
                    owner: {
                        $in: subscribedChannelsId,
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1,
                }
            },
            {
                $limit: 20
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [{
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            fullName: 1,
                        }
                    }]
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "$owner",
                    }
                }
            },
            {
                $project: {
                    thumbnail: 1,
                    "videoFile.mp4": 1,
                    "videoFile.hls": 1,
                    title: 1,
                    views: 1,
                    owner: 1,
                }
            }
        ])

        const randomVideos = await Video.aggregate([
            {
                $match: {
                    owner: {
                        $nin: subscribedChannelsId,
                    }
                }
            },
            {
                $sample: {
                    size: 10,
                }
            },
            // {
            //     $sort: {
            //         views: -1,
            //     }
            // },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [{
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            fullName: 1,
                        }
                    }]
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "$owner",
                    }
                }
            },
            {
                $project: {
                    thumbnail: 1,
                    "videoFile.mp4": 1,
                    "videoFile.hls": 1,
                    title: 1,
                    views: 1,
                    owner: 1,
                }
            }
        ])

        let feed = [];

        while (subscribedChannelsLatestVideos.length || randomVideos.length) {
            if (subscribedChannelsLatestVideos.length) {
                feed.push(subscribedChannelsLatestVideos.shift());
            }

            if (randomVideos.length) {
                feed.push(randomVideos.shift());
            }
        }

        return res
            .status(200)
            .json(new ApiResponse(200, "Feed updated", { videos: feed }))

    } else {
        const feed = await Video.aggregate([
            {
                $sample: {
                    size: 20,
                }
            },
            // {
            //     $sort: {
            //         views: -1
            //     }
            // },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [{
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            fullName: 1,
                        }
                    }]
                }
            },
            {
                $project: {
                    thumbnail: 1,
                    "videoFile.mp4": 1,
                    "videoFile.hls": 1,
                    title: 1,
                    views: 1,
                    owner: 1,
                }
            }
        ])

        return res
            .status(200)
            .json(new ApiResponse(200, "Feed updated", { videos: feed }))
    }
})

export { uploadVideo, deleteVideo, watchVideo, getChannelVideos, searchVideos, homePage }