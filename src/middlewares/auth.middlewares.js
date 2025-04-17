import jwt from 'jsonwebtoken'
import { User } from '../models/user.models.js'
import { ApiError } from '../utils/apiError'
import { asyncHandler } from '../utils/asyncHandler'
import { User } from '../models/user.models'

export const verifyJWT = asyncHandler(async (req, _id, next) => {
    const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Unauthorized")
        }

        req.user = user

        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})