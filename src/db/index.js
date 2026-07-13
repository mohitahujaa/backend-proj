import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const dbConnect = async () => {
    try{
        const dbConnectInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("MongoDB connected. DB name : ", dbConnectInstance.connection.name);
        console.log("Final URI:", `${process.env.MONGODB_URI}/${DB_NAME}`);
    }catch(error){
        console.error("MONGODB CONNECTION FAILED: ", error);
        process.exit(1);
    }
}

export default dbConnect;