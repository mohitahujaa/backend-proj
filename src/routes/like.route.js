import Router from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js';
import { toggleVideoLike } from '../controllers/like.controller.js';

const router = Router();

router.route('/video/:videoId').post(verifyJWT, toggleVideoLike)

export default router;