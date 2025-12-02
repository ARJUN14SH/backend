import {ApiError} from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

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

const loginUser=asyncHandler(async(req,res)=>{
    //req data from body
    // username or  email
    //check is the user registered
    //check password then
    // access and refresh token
    // send cookie

    //just keep in mind only then only send data with forms when u are using any middleware in between beacuse it share both text and file
       console.log(req.body);

    const {username,email,password}=req.body;

    console.log(req.body);

    if(!username && !email){
       throw new ApiError(400,"username and email is required")
    }

    const user=await User.findOne({
      $or:[{username},{email}]
    })
    

    if(!user){
      throw new ApiError(404,"user is not registered")
    }

    const isPasswordValid=user.isPasswordCorrect(password);

    if(!isPasswordValid){
       throw new ApiError(401,"password is wrong")
    }

      const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)


      const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)//accesstoken name cookie we are adding in aur res using cookie parser
    .cookie("refreshToken", refreshToken, options)//refreshtoken name cookie we are adding in aur res using cookie parser
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )


})

const logoutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken=asyncHandler(async(req, res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
      throw new ApiError(401,"unotharized request")
    }

    try {
      const decodedToken=jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
        
      )
  
      const user=await User.findById(decodedToken?._id);
  
      if(!user){
        throw new ApiError(401,"invalid token")
      }
  
      if(incomingRefreshToken!==user.refreshToken){
        throw new ApiError(401,"refresh token is expired or used")
      }
      
      const options = {
          httpOnly: true,
          secure: true
      }
  
      const {accessToken,newRefreshToken}=await generateAccessAndRefereshTokens(user._id)
  
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
          new ApiResponse(
              200, 
              {
                 accessToken, refreshToken:newRefreshToken
              },
              "User logged In Successfully"
          )
      )
    } catch (error) {
      throw new ApiError(401,error?.message||"invalid token")
    }

})



export {registerUser,loginUser,logoutUser,refreshAccessToken}