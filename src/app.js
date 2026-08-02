import express from 'express'
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credenentials: true
}))

app.use(express.json({
    limit: "16kb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(express.static("public"))

app.use(cookieParser());

// router import
import userRouter from './routes/user.routes.js';
import subscriberRouter from './routes/subscribe.route.js';
import videoRouter from './routes/video.route.js';
import likeRouter from './routes/like.route.js'

app.use("/api/v1/user", userRouter);
app.use("/api/v1/subscribe", subscriberRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/like", likeRouter);


export { app };