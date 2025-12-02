import { Router } from "express";
import { registerUser,loginUser,logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router=Router();

router.route("/register").post(
    upload.fields([  // the use of multer lead to a extension which lead to add files in cloudinary with disturbing express beacuse it cant handle it 
    {
        name:"avatar",
        maxCount:1          // thats the reason why field like avatar and coverImgae is handle by it
    },
    {
        name:"coverImage",
        maxCount:1
    }
]),
    registerUser)


    router.route("/login").post(loginUser);

    //secured routes
    router.route("/logout").post(verifyJWT,logoutUser)
    router.route("/refresh-token").post(refreshAccessToken)
    router.route("/change-password").post(verifyJWT,changeCurrentPassword)
    router.route("/currect-user").post(verifyJWT,getCurrentUser)
    router.route("/update_account").post(verifyJWT,updateAccountDetails)
    router.route("/avatar").post(verifyJWT,upload.single(avatar),updateUserAvatar)
    router.route("/coverImage").post(verifyJWT,upload.single(coverImage),updateUserCoverImage)
    router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
    router.route("/history").get(verifyJWT,getWatchHistory)



export default router