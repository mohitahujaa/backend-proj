import Router from 'express';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

import {deleteComment, toggleComentLike } from '../controllers/comment.controller.js';

router.route("/:commentId/like").patch(verifyJWT, toggleComentLike)
router.route("/:commentId/delete").delete(verifyJWT, deleteComment);

export default router; 