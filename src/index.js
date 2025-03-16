import dotenv from 'dotenv'
import { app } from './app.js'
import connectToDatabase from './db/databaseConnection.js'

dotenv.config({
  path: "./.env"
})

const PORT = process.env.PORT || 4000

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.log("MongoDb Connection Error", error)
  })