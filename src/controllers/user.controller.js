import { asyncHandler } from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {ApiResponce} from '../utils/apiResponce.js'
import {User } from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'


const registerUser = asyncHandler(async (req,res) =>{
     const {fullName  , email ,username ,  password } =req.body

    //  validation
    if(
        [fullName,email,username , password ].some((fields) => fields?.trim()=== "")
    ){
        throw new ApiError(400 , "All fields are required")
    }

    // find the user already registered or not
  const existedUser = await User.findOne({
        $or:[
            {username},{email}
        ]
    })

    if(existedUser){
        throw new ApiError(409 , "User with the same username already exists")
    }

    // handle images
    const avatarLocalPath = req.file?.avatar[0]?.path
    const coverImageLocalPath = req.file?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is missing")
    }

    // send the images on cloudinary
     const avatar = await uploadOnCloudinary(avatarLocalPath)
     let coverImage = ''
     if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImage)
     }

    //  user creating
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage :coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
     })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser){
    throw new ApiError(500, "Something went wrong while register the user")
   }

   return res
           .status(201)
           .json(new ApiResponce(200,createdUser,"User registered successfully"))

}) 


export {
    registerUser
}