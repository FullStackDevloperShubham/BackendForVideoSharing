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

export {
    registerUser,
    logInUser,
    refreshAccessToken,
    logOutUser
}