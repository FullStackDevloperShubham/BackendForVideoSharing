import { Router } from 'express'
import { registerUser , logOutUser } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.midlleware.js'
import { verifyJWT } from '../middlewares/auth.middlewares.js'


const router = Router()

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

// secure routes
router.route('/logout').post(verifyJWT, logOutUser)

export default router