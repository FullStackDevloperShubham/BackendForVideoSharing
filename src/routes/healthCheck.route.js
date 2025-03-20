import { Router } from 'express'
import { helthCheck } from '../controllers/helthCheck.controller.js'
import { upload } from '../middlewares/multer.midlleware.js'

const router = Router()

router.route('/').get(helthCheck)

export default router