import mongoose, {Schema} from 'mongoose';
import mongooseAggreagatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new Schema(
    {
        videoFile: {
            mp4: {
                type: String,
                required: true
            },
            hls: {
                type: String,
                required: true
            },
            public_id: {
                type: String,
                required: true
            }
        },

        thumbnail: {
            type: String, //cloudinary url
            // required: true
        },
        duration: {
            type: Number, //from cloudinary
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        resolution: {
            width: {
                type: Number,
                required: true
            },
            height: {
                type: Number,
                required: true
            }
        },
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        comments: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    }, {timestamps: true}
)

videoSchema.plugin(mongooseAggreagatePaginate);

videoSchema.index({
    title: 1,
    owner:1
})

export const Video = mongoose.model("Video", videoSchema); 