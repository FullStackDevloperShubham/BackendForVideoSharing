import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config()


// cloudinary configuration
cloudinary.config({
    cloud_name:'dfmpbwi8u',
    api_key:'222738331189187',
    api_secret:'Dr_OObo79OSlSE7EfucufTdHQfM',
    secure:true
});


const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null

       const response =  await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })

        console.log("File uploaded successfully:", response); // debbug

        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}

// delete the images from cloudinary 
const deleteFromCloudinary = async(publicId)=>{
    try {
        await cloudinary.uploader.destroy(publicId)
        console.log("File deleted successfully", publicId)
    } catch (error) {
        console.log("Error deleting file from cloudinary", error)
        return null
    }
}

export { uploadOnCloudinary,deleteFromCloudinary }