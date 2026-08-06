import mongoose, { Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const likeSchema = new Schema({
        likedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        targetId: {
            type: Schema.Types.ObjectId,
            refPath: "targetType",
            required: true
        },
        targetType: {
            type: String,
            enum: ["Video", "Comment"],
            required: true
        }
    },
    {timestamps: true}
);

likeSchema.index(
    {
        likedBy: 1,
        targetId: 1,
        targetType: 1
    },
    {
        unqiue: true
    }
);

likeSchema.plugin(mongooseAggregatePaginate)

export const Like = mongoose.model("Like", likeSchema);