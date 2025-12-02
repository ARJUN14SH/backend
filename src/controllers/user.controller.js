import {ApiError} from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body;

  const user=await User.findById(req.user?._id);
  const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password")
  }

  user.password=newPassword;
  await user.save({validateBeforeSave:false})

  return res.status(200).json(
    new ApiResponse(200,{},"password changed successfully")
  )
})

const getCurrentUser=asyncHandler(async(req,res)=>{

  return res.status(200)
  .json( new ApiResponse(200,req.user,"currect user fetched successfully"))

})

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullName,email}=req.body;

    if(!fullName && !email){
      throw new ApiError(400,"all field are required")
    }

    const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
    $set:{
         fullName,
         email
         }
      },
      {
        new:true
      }
    ).select("-password")


    return res.status(200)
    .json(
     new ApiResponse(200,user,"user detail updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{

  const {username}=req.params;

    if(!username?.trim()){
      throw new ApiError(400,"username is missing")
    }

    const channel=await User.aggregate([
      {
        $match:{
           username: username?.toLowerCase()
        }
      },
      /*
      this is what happing in lookupthat there is a fiel of subscriber which is as that have coolection of that of 
      different user for same channel
      
      {
  "_id": "userB",
  "username": "rohan",

  "subscriber": [
    { "subscriber": "userA", "channel": "userB" },
    { "subscriber": "userC", "channel": "userB" },
    { "subscriber": "userD", "channel": "userB" }
  ]
        }
   */
      {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channel",// what here the foreign field do that is says to subscription model that every user with this channel field should be here
          as:"subscriber"
        }
      },
      /*here the thing are just swapped that foreignfield is subscriber which points that this 
      subscriber subscribed to whi
      which channel  
      
      the resson that there is the relation only betwwen channel and subscrible is (from:"subscription")which is a
      model on those two input field
      
      */
      {
          $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
      },
      {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },

        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])


    if(!channel?.length){
      throw new ApiError(404,"channel does not exist");
    }

     return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory=asyncHandler(async(req,res)=>{
       const user=await User.aggregate([
        {
          $match:{
                 _id: new mongoose.Types.ObjectId(req.user._id)//this way we write in pipelines

          },
           $lookup:{
              from:"videos",
              localField:"watchHistory",
              foreignField:"_id",
              as:"watchHistory",
              pipeline:[
                {
                  $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                      {
                        $project:{
                          fullName:1,
                          username:1,
                          avatar:1
                        }
                      }
                    ]
                  }
                },
                {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                       ]
            }
        }
    ])

     return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )

  })



export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,
  updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory}