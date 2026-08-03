import Router from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

import { getLikedVideos, toggleVideoLike } from '../controllers/like.controller.js';

router.route('/video/:videoId').post(verifyJWT, toggleVideoLike)
router.route('/get-liked-videos').post(verifyJWT, getLikedVideos)

export default router;