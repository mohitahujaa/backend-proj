import { Router } from "express";
import { toggleSubscribe } from "../controllers/subscriber.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.route('/:channel').post(verifyJWT, toggleSubscribe);

export default router;