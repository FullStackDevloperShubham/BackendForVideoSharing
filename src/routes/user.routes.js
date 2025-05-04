import { Router } from 'express'
import { registerUser , 
    logOutUser, 
    logInUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentuser,
    getUserChannelProfile,
    updateAccountDetails,
    updateUserCoverImage,
    updateUserAvatar,
    getWatchHistory
} from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.midlleware.js'
import { verifyJWT } from '../middlewares/auth.middlewares.js'


const router = Router()

// unsecure routes
router.route('/register').post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },{
            name:"coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route('/login').post(logInUser)
router.route('/refresh-token').post(refreshAccessToken)

// secure routes
router.route('/logout').post(verifyJWT, logOutUser)
router.route('/change-password').post(verifyJWT,changeCurrentPassword)
router.route('/current-user').get(verifyJWT,getCurrentuser)
router.route('/c/:username').get(verifyJWT,getUserChannelProfile)
router.route('/update-account').patch(verifyJWT,updateAccountDetails)
router.route('/avatar').patch(verifyJWT,upload.single('avatar'),updateUserAvatar)
router.route('/cover-image').patch(verifyJWT,upload.single('coverImage'),updateUserCoverImage)
router.route('/history').get(verifyJWT,getWatchHistory)



export default router