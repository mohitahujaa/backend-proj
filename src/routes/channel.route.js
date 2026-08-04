import { Router } from "express";
import { getSubscribedChannels, toggleSubscribe } from "../controllers/subscriber.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getPublicChannelPage } from "../controllers/user.controllers.js";
import { getChannelVideos } from "../controllers/video.controller.js";

const router = Router();

router.route('/:channelUsername/subscribe').post(verifyJWT, toggleSubscribe);
router.route('/:username').get(verifyJWT, getPublicChannelPage);
router.route('/:channelUsername/videos').get(verifyJWT, getChannelVideos);

export default router;