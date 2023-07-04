const express = require('express')
const cors = require('cors')
const passport = require('passport')
const httpStatus = require('http-status')
const routes = require('./route')
const { jwtStrategy } = require('./config/passport')
const { errorConverter, errorHandler } = require('./middlewares/error')
const ApiError = require('./helper/ApiError')

const upload = require('./helper/uploadFiles')

process.env.PWD = process.cwd()

const app = express()

// const upload = multer()

// Parse form data
// app.use(upload.none())

// enable cors
app.use(cors())
app.options('*', cors())

app.use(express.static(`${process.env.PWD}/public`))
app.use(express.static(`${process.env.PWD}/uploads`))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// jwt authentication
app.use(passport.initialize())
passport.use('jwt', jwtStrategy)

app.get('/', async (req, res) => {
  res.status(200).send('Congratulations! API is working!')
})
app.use('/api', routes)

// Set up the multer middleware
// const upload = multer({ dest: 'uploads/' })

// File upload route
app.post('/api/upload', async (req, res) => {
  // Access the uploaded files through req.files
  await upload.array('uploadedImages')
  console.log('req', req.files)
  res.send('Files uploaded successfully')
})

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'))
})

// convert error to ApiError, if needed
app.use(errorConverter)

// handle error
app.use(errorHandler)
const db = require('./models')

// Uncomment this line if you want to sync database model
db.sequelize.sync()

module.exports = app
