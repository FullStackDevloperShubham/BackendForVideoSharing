import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { ApiResponce } from '../utils/apiResponce.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async (userId) => {
    const user = await User.findById(userId)

    // cheking the user is present in database
    if (!user) return res.send(400, { message: "No access and refresh token found" })

    try {
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
    } catch (error) {
        throw new Error(500, "Something went wrong while generating refresh token and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    //  validation
    if (
        [fullname, email, username, password].some((fields) => fields?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // find the user already registered or not
    const existedUser = await User.findOne({
        $or: [
            { username }, { email }
        ]
    })

    if (existedUser) {
        throw new ApiError(409, "User with the same username already exists")
    }

    console.warn(req.files)

    // handle images
    const avatarLocalPath = req.files.avatar[0].path;
    const coverImageLocalPath = await req.files?.coverImage?.[0]?.path

    console.log(`avatar local path ${avatarLocalPath} \n cover image ${coverImageLocalPath}`)

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    // send the images on cloudinary
    //  const avatar = await uploadOnCloudinary(avatarLocalPath)
    //  let coverImage = ''
    //  if(coverImageLocalPath){
    //     coverImage = await uploadOnCloudinary(coverImage)
    //  }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Uploaded avatar", avatar)
    } catch (error) {
        console.log("Error Uploading avatar", error)
        throw new ApiError(500, "Failed to upload avatar")
    }

    let coverImage;;
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
        console.log("Uploaded coverImage", coverImage)
    } catch (error) {
        console.log("Error Uploading coverImage", error)
        throw new ApiError(500, "Failed to upload coverImage")
    }


    try {
        //  user creating
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while register the user")
        }

        return res
            .status(201)
            .json(new ApiResponce(200, createdUser, "User registered successfully"))
    } catch (error) {
        console.log("User creating is failed",)
        if (avatar) {
            await deleteFromCloudinary(avatar.public_id)
        }
        if (coverImage) {
            await deleteFromCloudinary(coverImage.public_id)
        }
        throw new ApiError(500, "Something went wrong while register the user and images were deleted")
    }

})

const logInUser = asyncHandler(async (req, res) => {
    // get data from body 
    const { email, username, password } = req.body

    // validation
    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    // find the user already registered or not
    const user = await User.findOne({
        $or: [
            { username }, { email }
        ]
    })

    // validate the user
    if (!user) {
        throw new ApiError(401, "user not found")
    }

    // validate the password
    const isPasswordValid = await user.isPasswordCorrect(password)

    //    validate
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }

    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const logInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    if (!logInUser) {
        throw new ApiError(500, "Something went wrong while login the user")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(new ApiResponce(
            200,
            {
                user: logInUser,
                accessToken: accessToken,
                refreshToken
            },
            "User logged in successfully"
        ))

})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshAccessToken", options)
        .json(new ApiResponce(
            200,
            {},
            "User logged out successfully"
        ))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshAccessToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Refresh Token is Required")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .json(
                new ApiResponce(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access tokem refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refressh access token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }

    user.password = newPassword

    await user.save({
        validateBeforeSave: false
    })
    return res.status(200).json(
        new ApiResponce(
            200,
            {},
            "Password changed successfully"
        )
    )

})

const getCurrentuser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponce(
            200,
            req.user,
            "Current user fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body

    // validation
    if (!fullname || !email) {
        throw new ApiError(400, "Fullname and email are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {
            new: true,
        }
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponce(
            200,
            user,
            "Account details updated successfully"
        )
    )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true,
        },
    ).select("-password -refreshToken")

    res.status(200).json(
        new ApiResponce(
            200,
            user,
            "Avatar updated successfully"
        )
    )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "Something went wrong while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true,
        },
    ).select("-password -refreshToken")

    res.status(200).json(
        new ApiResponce(
            200,
            user,
            "Cover image updated successfully"
        )
    )

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscriberdTo"
                }
            },
            {
                $addFields: {
                    subscibersCount: {
                        $size: "$subscribers"
                    }
                },
                $channelSubscribedToCount: {
                    $size: "$subscriberdTo"
                },
                isSubscribed: {
                    $condition: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            },
            {
                $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscibersCount: 1,
                    channelSubscribedToCount: 1,
                    isSubscribed: 1,
                    email: 1,
                }   
            }
        ]
    )

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res.status(200).json(
        new ApiResponce(
            200,
            channel[0],
            "Channel profile fetched successfully"
        )
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
     const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from : "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner:{
                                $first  : "$owner"
                            }
                        }
                    }
                ]
            }
        },
     ])

        if(!user?.length){
            throw new ApiError(404, "User not found")
        }

        return res.status(200).json(new ApiResponce(200, user[0].watchHistory, "Watch history fetched successfully"))
})

export {
    registerUser,
    logInUser,
    refreshAccessToken,
    logOutUser,
    changeCurrentPassword,
    getCurrentuser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}