// import dotenv from 'dotenv';
import dbConnect from './db/index.js';
import mongoose from 'mongoose';
import express from 'express';

// dotenv.config({
//     path: './.env'
// })

const app = express();
dbConnect()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`The server is listening on port ${process.env.PORT} or 8000`)
    })

    app.on("error", (err) => {
        console.error("ERROR : ", err);
        throw err;
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed, error on our app side");
})