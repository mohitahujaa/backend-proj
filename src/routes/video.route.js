import { Router } from 'express';
const router = Router();
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import { upload } from '../middlewares/multer.middlewares.js';



import { uploadVideo } from '../controllers/video.controller.js';
router.route("/upload").post(verifyJWT, upload.single('video'), uploadVideo)

export default router;