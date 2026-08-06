import { Like } from "../models/like.model";
import { Video } from "../models/video.models";
import { Comment } from "../models/comment.model";

const deleteVideoById = async (videoId, userId, session) => {

    const video = await Video.findById(videoId).session(session);
    if(!video) throw new ApiError(404, "Video doesn't exist");

    const public_id = video?.videoFile?.public_id;

    if(!video.owner.equals(userId)) throw new ApiError(403, "Bad request!, You are not authorised");

    await Like.deleteMany({
            targetId: videoId,
            targetType: "Video",
        },
        {
            session
        }
    );

    const comments = await Comment.find({
        targetId: videoId,
        targetType: "Video",
    }).session(session).select("_id").lean();

    const commentIds = comments.map(comment => comment._id);

    await Like.deleteMany({
            targetId: {
                $in: commentIds
            },
            targetType: "Comment",
        },
        {
            session
        }
    );

    await Comment.deleteMany({
            _id: {
                $in: commentIds
            }
        },
        {
            session
        }
    );

    const dataDeleted = await Video.findByIdAndDelete(video._id, { session });
    if(!dataDeleted) throw new ApiError(500, "Unable to delete the video");

    // await session.commitTransaction();     
    return public_id;
}

const deleteVideoLike = async(likeId, videoId, session) => {
    const isDeleted = await Like.findByIdAndDelete(likeId, { session });
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

    return decVideoLikes;
}

const deleteCommentLike = async(likeId, commentId, session) => {
    const isDeleted = await Like.findByIdAndDelete(likeId, { session });
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

    return decCommentLikes;
}

const deleteCommentById = async(commentId, userId, session) => {

    if (!commentId?.trim()) throw new ApiError(404, "Comment does not exist");

    if (!mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(404, "Comment does not exist");

    //check if the comment exists 
    const comment = await Comment.findById(commentId).select("author targetId targetType").session(session).lean();
    if (!comment) throw new ApiError(404, "Comment does not exist");

    //verify the owner
    const isOwner = comment.author.equals(userId);
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

    return decVideoCommentCnt;
}

export { deleteVideoById, deleteVideoLike, deleteCommentLike, deleteCommentById }