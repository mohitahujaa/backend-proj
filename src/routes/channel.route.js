import { Router } from "express";
import { getSubscribedChannels, toggleSubscribe } from "../controllers/subscriber.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route('/:channelUsername/subscribe').post(verifyJWT, toggleSubscribe);

export default router;