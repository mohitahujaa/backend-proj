import Router from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

import { doComment, deleteComment } from '../controllers/comment.controller.js';
import { upload } from '../middlewares/multer.middlewares.js';

router.route("/video/:videoId").post(verifyJWT, upload.none(), doComment);
router.route("/delete/:commentId").post(verifyJWT, deleteComment);

export default router; 