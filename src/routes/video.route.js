import { Router } from 'express';
const router = Router();
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import { upload } from '../middlewares/multer.middlewares.js';



import { uploadVideo, deleteVideo, watchVideo } from '../controllers/video.controller.js';
import { toggleVideoLike } from '../controllers/like.controller.js';
import { doComment, getVideoComments } from '../controllers/comment.controller.js';

router.route("/upload").post(verifyJWT, upload.single('video'), uploadVideo)
router.route("/watch/:videoId").get(verifyJWT, watchVideo);
router.route("/delete/:videoId").delete(verifyJWT, deleteVideo)

router.route("/:videoId/like").post(verifyJWT, toggleVideoLike);

router.route("/:videoId/comment").post(verifyJWT, upload.none(), doComment);
router.route("/:videoId/comments").get(verifyJWT, getVideoComments);

export default router;