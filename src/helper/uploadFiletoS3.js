const path = require('path')
const AWS = require('aws-sdk')
const fs = require('fs')

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
})

const s3 = new AWS.S3()
/**
 * Uploads a file to an S3 bucket
 * @param {string} filePath - The path to the file you want to upload
 * @param {string} bucketName - The S3 bucket name
 * @param {string} key - The key (filename) to assign to the file in S3
 */
const uploadFileToS3 = async (filePath, bucketName, key) => {
  try {
    // Read the file from the file system
    const fileContent = fs.readFileSync(filePath)

    // Get the file extension and set the appropriate content type
    const fileExtension = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream' // Default for binary files
    if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      contentType = 'image/jpeg'
    } else if (fileExtension === '.png') {
      contentType = 'image/png'
    } else if (fileExtension === '.pdf') {
      contentType = 'application/pdf'
    } else if (fileExtension === '.trf') {
      contentType = 'application/octet-stream'
    } // Set TRF to generic binary type

    // S3 upload parameters
    const params = {
      Bucket: bucketName, // Name of your S3 bucket
      Key: key, // File name you want to assign in S3
      Body: fileContent, // File content
      ContentType: contentType, // Set the content type
    }

    // Upload the file to S3
    const data = await s3.upload(params).promise()

    console.log(`File uploaded successfully. S3 URL: ${data.Location}`)
    return data.Location // Return the URL of the uploaded file
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

module.exports = uploadFileToS3