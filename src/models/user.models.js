import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema(
  {
    username: {
      type: String,
      require: true,
      unique: true,
      lowercase: true,
      trim: true,
      index:true
    },
    email:{
      type:String,
      require: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname:{
      type: String,
      required: true,
      trim: true,
      index:true
    },
    avatar:{
      type: String, //cloundinary URL
      required: true,
    },
    coverImage:{
      type: String, //cloundinary URL
      required: true,
    },
    watchHistory:[
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      }
    ],
    password:{
      type: String,
      required: [true,  "Enter your password"]
    },
     refreshToken:{
      type: String,
     }
  },{
    timestamps: true,
  })

export const User = mongoose.model("User", userSchema)