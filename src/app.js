import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({
    limit: '16kb'
}))
app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}))
app.use(express.static('public'))
app.use(cookieParser())

// routes import

import userRouter from './routes/user.routes.js'

// routes declaration
// we don't use app.get(...) here because we are handling routes and controllers in different files
app.use("/api/v1/users",userRouter)

export {app}