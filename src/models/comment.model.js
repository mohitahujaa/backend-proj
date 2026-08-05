import mongoose, { Schema }from "mongoose";

const commentSchema = new Schema(
    {
        text: {
            type: String,
            required: true,
            maxlength: 10000,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "targetType",
            required: true
        },
        targetType: {
            type: String,
            enum: ["Video"],
            required: true
        },
        likes: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true
    }
)

export const Comment = mongoose.model("Comment", commentSchema);