import mongoose, {Schema} from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const userSchema = new Schema(
    {
        username: {
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            unique: true,
            required: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            url: { 
                type: String,
                required : true,
            },
            public_id : {
                type: String,
                required: true
            }
        },
        coverImage: {
            url: {
                type: String,
                // required: true
            },
            public_id : {
                type: String,
                // required: true
            }
        },
        watchHistory: [
            {
                video: {
                    type: Schema.Types.ObjectId,
                    ref: "Video"
                },
                watchedAt: {
                    type: Date,
                    default: Date.now(),
                }
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        subscribersCount: {
            type: Number,
            required: true,
            default: 0
        },
        toSubscribedCount: {
            type: Number,
            required: true,
            default: 0
        },
        refreshToken: {
            type: String
        }
    }, {timestamps: true}
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken =  function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        }, 
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
};

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        }, 
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};

userSchema.plugin(mongooseAggregatePaginate);

export const User = mongoose.model("User", userSchema);