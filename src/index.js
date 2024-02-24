import dotenv from 'dotenv'
import connectDB from './db/index.js'

dotenv.config({
    path:'./env'
})


connectDB()






















// require("dotenv").config({path:'./env'})

// ;(async function connectDB() {
//     try {
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     } catch (error) {
//         console.error(`ERR : ${error}`);
//         throw error
//     }
// })()