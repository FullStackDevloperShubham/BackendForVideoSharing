import { ApiResponce } from '../utils/apiResponce.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const helthCheck = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponce(200, "OK", "Health check pass"))
})

export { helthCheck }