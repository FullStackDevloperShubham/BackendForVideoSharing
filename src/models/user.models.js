import mongoose, { Schema } from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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


  // hash the password before saving into the database
userSchema.pre("save",async function (next){

  if(!this.isModified("password")) return next()

  this.password = bcrypt.hash(this.password,10)

  next()
})

// matching the password
userSchema.methods.isPasswordCorrect = async function(password){
 return  await bcrypt.compare(password , this.password)
}

// generating access token
userSchema.methods.generateAccessToken = function(){
  // short lived access token
  return jwt.sign(
    { 
        _id : this._id,
        email : this.email,
        fullname : this.fullname
     }, 
     process.env.ACCESS_TOKEN_SECRET,
    { expiresIn:  process.env.ACCESS_TOKEN_EXPIRY}
  );
}

// generate generateRefreshToken
userSchema.methods.generateRefreshToken = function(){
  // short lived access token
  return jwt.sign(
    { 
        _id : this._id,
     }, 
     process.env.REFRESH_TOKEN_SECRET,
    { expiresIn:  process.env.REFRESH_TOKEN_EXPIRY}
  );
}



export const User = mongoose.model("User", userSchema)