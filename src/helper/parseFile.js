/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
const fs = require('fs')
const httpStatus = require('http-status')
const csv = require('csv-parser')
const excel = require('exceljs')
const ApiError = require('./ApiError')

const workbook = new excel.Workbook()

const parseFile = async (filePath, type) => {
  const results = []
  if (['text/csv', 'application/csv'].includes(type)) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          return results.push(
            Object.keys(data).reduce((a, b, i) => {
              a = {
                ...a,
                [(b || `item${i}`).replace(' ', '_').toLowerCase()]: data[b],
              }
              return a
            }, {})
          )
        })
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
  }
  if (
    [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(type)
  ) {
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
                    [(data[i] || `item${i}`).replace(' ', '_').toLowerCase()]:
                      b,
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
  }
  // json dtata
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        try {
          const jsonData = JSON.parse(data).reduce((acc, curr) => {
            const obj = Object.keys(curr).reduce((a, b, i) => {
              a = {
                ...a,
                [(b || `item${i}`).replace(' ', '_').toLowerCase()]: curr[b],
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

const processResult = (key) => {
  switch (String(key)) {
    case '½ - ½':
      return '0.5-0.5'
    case '1':
      return '1-0'
    case '½':
      return '0.5-0'
    case '0':
      return '0-0'
    default:
      return key.replace(/\s/g, '')
  }
}

const parseChessResultFile = async (filePath, type, format) => {
  const results = []
  let round = 0
  if (['text/csv', 'application/csv'].includes(type)) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          return results.push(
            Object.keys(data).reduce((a, b, i) => {
              a = {
                ...a,
                [(b || `item${i}`).replace(' ', '_').toLowerCase()]: data[b],
              }
              return a
            }, {})
          )
        })
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
  }
  if (
    [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(type)
  ) {
    return new Promise((resolve, reject) => {
      workbook.xlsx
        .readFile(filePath)
        .then(() => {
          const worksheet = workbook.getWorksheet(1)

          const data = []
          let heading = format === 'pairings' ? 6 : 5
          worksheet.eachRow((row, rowNumber) => {
            if (row.values.length === 0) return
            const text = (row?.values?.[1] || '').toString()?.replace(/\s/g, '')
            if (format === 'pairings' && text?.includes('Round')) {
              round = text.slice(5, 6)
              heading = rowNumber + 1
            } else if (format === 'players' && text?.includes('Starting')) {
              heading = rowNumber + 1
            }
            if (rowNumber === heading) {
              for (let i = 0; i <= row.values.length; i += 1) {
                const v = row.values[i]
                if (!v && row.values[i + 1] === 'Name') {
                  data[i] = 'title'
                } else if (v === 'FideID') {
                  data[i] = 'fide_id'
                } else if (['Rtg', 'RtgI'].includes(v)) {
                  data[i] = 'rating'
                } else if (v === 'Pts.') {
                  data[i] = 'score'
                } else {
                  data[i] = v?.trim()
                }
              }
            } else if (row?.values?.length > 4) {
              let color = 'white'
              const res = row.values.reduce((a, b, i) => {
                if (['players', 'team'].includes(format)) {
                  a.gender = 'M'
                  a.birth_year = 2012
                  a = {
                    ...a,
                    [(data[i] || `item${i}`).replace(' ', '_')?.toLowerCase()]:
                      b,
                  }
                } else if (data[i] === 'Result') {
                  const currentScore = processResult(b)
                  a[color].result = currentScore
                  color = 'black'
                  a[color] = { ...a.white, result: currentScore }
                } else if (
                  (data[i - 1] === 'Result' && data[i] === 'score') ||
                  (data[i] === 'score' && data[i + 1] === 'Result')
                ) {
                  color = 'black'
                  if (!a[color]) a[color] = { ...a.white }
                } else if (data[i] === 'Name' && b === 'bye') {
                  a[color].name = b
                  a.white.result = '1-0'
                } else if (data[i] === 'score') {
                  if (typeof b === 'string' && b.includes('½')) {
                    b = b.split('').reduce((t, c) => {
                      return t + Number(c.replace('½', 0.5))
                    }, 0)
                  }
                  a[color].score = Number(b)
                } else {
                  a[color] = {
                    ...a[color],
                    [(data[i] || `item${i}`)?.replace(' ', '_')?.toLowerCase()]:
                      b,
                  }
                }
                return a
              }, {})
              results.push(res)
            }
          })
          resolve({ results, round })
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
  }
  // json dtata
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        try {
          const jsonData = JSON.parse(data).reduce((acc, curr) => {
            const obj = Object.keys(curr).reduce((a, b, i) => {
              a = {
                ...a,
                [(b || `item${i}`).replace(' ', '_').toLowerCase()]: curr[b],
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

module.exports = { parseFile, parseChessResultFile }
