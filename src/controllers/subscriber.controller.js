import { Subscription } from "../models/subscription.models.js";
import mongoose, {Schema} from 'mongoose';
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscribe = asyncHandler( async (req, res) => {
    //get channel from the url
    //check if the channel exists
    //prevent user from subscribing himself
    //check if already subscribed then unsubscribe
    //begin a session for -adding/deleting data to subscriber collection
    //                    -inc/dec count of channel
    //                    -inc/dec count of toSubscribed
    //commit the transaction

        const channelUsername = req.params?.channelUsername;
        if(!channelUsername) throw new ApiError(400, "Channel name is missing");

        const channel = await User.findOne({ username: channelUsername }, { _id: 1}).lean();
        if(!channel) throw new ApiError(404, "Channel does not exists");

        //check if sub/unsub to himself
        if(req.user?._id.equals(channel._id)) throw new ApiError(400, "Users can't subscribe to their own channel");

        //check if alr subscribed    
        const isSubscribed = await Subscription.findOne({ subscriber: req.user?._id, channel: channel._id})
        // console.log(isSubscribed);

        //starting a session for all transactions to execute-
        const session = await mongoose.startSession();

        try {
            session.startTransaction();

            //subscribe
            if(!isSubscribed){
                const subscription = await Subscription.create([
                    {
                        subscriber: req.user._id,
                        channel: channel._id
                    }],
                    { session }
                )
                // console.log(subscription);
        
                const incrementSubscriberCount = await User.findByIdAndUpdate(
                    channel._id,
                    { $inc: { subscribersCount: 1} },
                    { session }
                )
        
                const incrementUserToSubscribedCount = await User.findByIdAndUpdate(
                    req.user._id,
                    { $inc: { toSubscribedCount: 1}},
                    { session }
                )
        
                await session.commitTransaction();

                return res
                .status(200)
                .json( new ApiResponse(200, "Channel subscription added", {isSubscribed: true} ));

            }
            else{ //unsubscribe
                const subscriptionDeleted = await Subscription.findOneAndDelete(
                    {
                        subscriber: req.user?._id, channel: channel._id
                    },
                    {session}
                )

                console.log(subscriptionDeleted);
                

                const decrementSubscribersCount = await User.findByIdAndUpdate(
                    channel._id,
                    {
                        $inc: {
                            subscribersCount: -1
                        }
                    },
                    {session}
                )

                const decrementUserToSubscribedCount = await User.findByIdAndUpdate(
                    req.user._id,
                    {
                        $inc: {
                            toSubscribedCount: -1
                        }
                    },
                    {session}
                )

                await session.commitTransaction();

                return res
                .status(200)
                .json( new ApiResponse(200, "Unsubscribed from this channel", {isSubscribed: false} ));
            } 
        } catch (error) {
                await session.abortTransaction();
                throw new ApiError(500, error.message || "Unable to update subscription, try again");

        } finally{
                await session.endSession();
        }
    }
)

const getSubscribedChannels = asyncHandler( async (req, res) => {
    const userId = req.user?._id;

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                createdAt: -1,
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            fullName: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $addFields: {
                "channel.subscibedAt": "$createdAt"
            }
        },
        {
            $replaceRoot: {
                newRoot: "$channel"
            }
        }
    ])

    return res
    .status(200)
    .json( new ApiResponse(200, "Subscriptions fetched successfully", subscribedChannels));
    
})

export {
    toggleSubscribe,
    getSubscribedChannels
}