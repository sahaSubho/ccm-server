const fs = require('fs')
const httpStatus = require('http-status')
const csv = require('csv-parser')
const excel = require('exceljs')
const ApiError = require('./ApiError')

const workbook = new excel.Workbook()

const parseFile = async (filePath, type) => {
  let results = []
  if (['text/csv', 'application/csv'].includes(type))
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) =>
          results.push(
            Object.keys(data).reduce((a, b) => {
              a = {
                ...a,
                [b.toLowerCase()]: data[b],
              }
              return a
            }, {})
          )
        )
        .on('end', () => {
          resolve(results)
        })
        .on('error', (error) => {
          // Handle the error here
          return reject(
            new ApiError(
              httpStatus.INTERNAL_SERVER_ERROR,
              `Error reading the CSV file: ${error}`
            )
          )
        })
    })
  if (
    [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(type)
  )
    return new Promise((resolve, reject) => {
      workbook.xlsx
        .readFile(filePath)
        .then(() => {
          const worksheet = workbook.getWorksheet(1)

          let data = []
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
              data = row.values
            } else {
              results.push(
                row.values.reduce((a, b, i) => {
                  a = {
                    ...a,
                    [data[i].toLowerCase()]: b,
                  }
                  return a
                }, {})
              )
            }
          })
          resolve(results)
        })
        .catch((error) => {
          return reject(
            new ApiError(
              httpStatus.INTERNAL_SERVER_ERROR,
              `Error reading the CSV file: ${error}`
            )
          )
        })
    })

  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        try {
          const jsonData = JSON.parse(data).reduce((acc, curr) => {
            const obj = Object.keys(curr).reduce((a, b) => {
              a = {
                ...a,
                [b.toLowerCase()]: curr[b],
              }
              return a
            }, {})
            acc.push(obj)
            return acc
          }, [])

          resolve(jsonData)
        } catch (parseError) {
          reject(parseError)
        }
      }
    })
  })
}

module.exports = parseFile
