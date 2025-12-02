import { Router } from "express";
import { registerUser,loginUser,logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
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

export default router