import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, getUser, changeUserPassword, updateAccountDetails, updateAvatarImage, updateCoverImage } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";


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
router.route('/update-account').post(verifyJWT, updateAccountDetails);
router.route('/change-password').post(verifyJWT, changeUserPassword);
router.route('/update-avatar').post(verifyJWT, upload.single('avatar'), updateAvatarImage);
router.route('/update-cover').post(verifyJWT, upload.single('coverImage'), updateCoverImage);

router.route('/refresh-token').post(refreshAccessToken);

export default router;