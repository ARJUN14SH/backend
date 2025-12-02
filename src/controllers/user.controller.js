import {ApiError} from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser=asyncHandler(async (req,res)=>
   // get data from frontent about user
   //validation-data non empty
   //check if (user already exist or not)
   // check for images,avatar and all and uplaod in cloudinary then check again in cloudinary
   //createobject of user --- and create db entry
   // remove pass and refresh token field from res
   //check for user creation 
   // return respose
   {

    const {email,fullName,password,username}=req.body;
    console.log(req.body);
    console.log(password);

  

    if(
        [email,fullName,password,username].some((field)=>field?.trim()==="")
    ){
        throw  new ApiError(400,"All field are required");
    }

  const existedUser=await User.findOne({
    $or:[{username},{email}]
  })

  if(existedUser){
    throw   new ApiError(409,"User with this username and email is aleredy registered");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
   let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

   if(!avatarLocalPath){
   throw   new ApiError(400,"Avatar file is required");
   }
      
  const avatar =await uploadOnCloudinary(avatarLocalPath);
  const coverImage=await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
  throw new ApiError(400,"Avatar file is required");
  }
   

  const user=await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    username:username.toLowerCase(),
    password,
    email
  })

  const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
   throw  new ApiError(500,"something went wrong user not registered")
  }


  return res.status(201).json(
    new ApiResponse(200,createdUser,"succesfully registration done")
  )

  



   }
   
)

export {registerUser}