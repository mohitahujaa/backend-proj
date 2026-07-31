import { Router } from 'express';
const router = Router();
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import { upload } from '../middlewares/multer.middlewares.js';



import { uploadVideo, deleteVideo } from '../controllers/video.controller.js';
router.route("/upload").post(verifyJWT, upload.single('video'), uploadVideo)
router.route("/delete").post(verifyJWT, deleteVideo)

export default router;