import { Router } from "express";
import { registerUser } from "../controllers/user.controllers.js";
import { loginUser } from "../controllers/user.controllers.js";
import { logoutUser } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { refreshAccessToken } from "../controllers/user.controllers.js";
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
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken)

export default router;