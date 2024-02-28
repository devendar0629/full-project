import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'

dotenv.config({
    path:'./.env'
})


connectDB()
    .then(() => {
        app.on("error",(err) => {
            console.log(`EXPRESS ERROR : ${err}`);
            throw err;
        })
        app.listen(process.env.PORT || 8000,(req,resp) => {
            console.log(`-------------------------------- EXPRESS Server listening at http://localhost:${process.env.PORT || 8000}`);
        })
    })
    .catch((err) => {
        console.log(`MONGODB -> CONNECTION FAILED : `,err);
    })






















// require("dotenv").config({path:'./env'})

// ;(async function connectDB() {
//     try {
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     } catch (error) {
//         console.error(`ERR : ${error}`);
//         throw error
//     }
// })()