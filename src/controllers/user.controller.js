import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { ApiResponce } from '../utils/apiResponce.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'

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
     if(avatar){
        await deleteFromCloudinary(avatar.public_id)
     }
     if(coverImage){
        await deleteFromCloudinary(coverImage.public_id)
     }
     throw new ApiError(500, "Something went wrong while register the user and images were deleted")
    }

})


export {
    registerUser
}