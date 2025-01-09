const AWS = require('aws-sdk')
const fs = require('fs')

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
})

const s3 = new AWS.S3()

const uploadFilesToS3 = async (file, pathKey) => {
  const fileContent = fs.readFileSync(file.path)
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME, // Replace with your bucket name
    Key: pathKey, // Generate a unique file name
    Body: fileContent,
    ContentType: file.mimetype,
  }

  const uploadResult = await s3.upload(params).promise()

  return uploadResult.Location
}

const renameFile = async (oldKey, newKey) => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME

    const fileData = await s3
      .getObject({
        Bucket: bucketName,
        Key: oldKey,
      })
      .promise()

    // Step 1: Copy the file to a new key
    await s3
      .upload({
        Bucket: bucketName,
        Body: fileData.Body,
        Key: newKey, // New key (name)
        ContentType: fileData.ContentType,
      })
      .promise()

    console.log(`File copied to ${newKey}`)

    // Step 2: Delete the old file
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: oldKey,
      })
      .promise()

    console.log(`Old file ${oldKey} deleted successfully`)
    return `File renamed to ${newKey}`
  } catch (error) {
    console.error('Error renaming file:', error)
    throw new Error('Failed to rename file')
  }
}

module.exports = { uploadFilesToS3, renameFile }
