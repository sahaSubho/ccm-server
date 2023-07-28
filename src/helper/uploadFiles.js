const fs = require('fs')
const multer = require('multer')
// Set up Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = 'uploads/'
    if (
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(
        file.mimetype
      )
    )
      dest += 'image/'
    else if (
      [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ].includes(file.mimetype)
    )
      dest += 'brochure/'
    else dest += 'files/'

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest)
    }

    cb(null, dest) // specify the folder where files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.' + file.originalname.split('.')[1]) // generate a unique filename
  },
})

// Initialize Multer upload
const upload = multer({ storage: storage })

module.exports = upload
