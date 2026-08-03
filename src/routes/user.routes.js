import { Router } from "express";
import { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    getUser, 
    changeUserPassword, 
    updateAccountDetails, 
    updateAvatarImage, 
    updateCoverImage, 
    getPublicChannelPage, 
    getWatchHistory,
    deleteAccount
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { getSubscribedChannels } from "../controllers/subscriber.controller.js";
import { getLikedVideos } from "../controllers/like.controller.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount : 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]) ,
    registerUser);

router.route('/login').post(upload.none(), loginUser);

//secured routes : 
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/get-user').post(verifyJWT, getUser);
router.route('/change-password').post(verifyJWT, changeUserPassword);
router.route('/update-account').patch(verifyJWT, updateAccountDetails);
router.route('/update-avatar').patch(verifyJWT, upload.single('avatar'), updateAvatarImage);
router.route('/update-cover').patch(verifyJWT, upload.single('coverImage'), updateCoverImage);
router.route('/history').get(verifyJWT, getWatchHistory);
router.route('/:username').get(verifyJWT, getPublicChannelPage);
router.route('/delete-account').delete(verifyJWT, upload.none(), deleteAccount);

router.route('/me/subscriptions').get(verifyJWT, getSubscribedChannels)
router.route('/me/liked-videos').get(verifyJWT, getLikedVideos)

export default router;