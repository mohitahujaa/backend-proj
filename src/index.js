// import dotenv from 'dotenv';
import dbConnect from './db/index.js';
import mongoose from 'mongoose';
import express from 'express';
import { app } from './app.js';
// dotenv.config({
//     path: './.env'
// }) resolved in the script in package.json nodemon -r dotenv/config index.js dotenv_config_path = './env'

dbConnect()
.then(() => {
    const PORT = Number(process.env.PORT);
    const server = app.listen(Number(PORT) || 8000, () => {
        console.log(` The server is listening on port ${PORT} or 8000`)
    })

    server.on("error", (err) => {
        console.error("ERROR : ", err);
        // throw err;
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed, error on our app side");
})