const httpStatus = require('http-status')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const UserDao = require('../dao/UserDao')
const LichessUserDao = require('../dao/LichessUserDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const { userConstant } = require('../config/constant')

class UserService {
  constructor() {
    this.userDao = new UserDao()
    this.lichessDao = new LichessUserDao()
  }

  /**
   * Create a user
   * @param {Object} userBody
   * @returns {Object}
   */
  createUser = async (userBody) => {
    try {
      let message =
        'Successfully Registered the account! Please Verify your email.'
      if (await this.userDao.isEmailExists(userBody.email)) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Email already taken'
        )
      }
      userBody.email = userBody.email.toLowerCase()
      userBody.password = bcrypt.hashSync(userBody.password, 8)
      userBody.active = userConstant.STATUS_ACTIVE

      let userData = await this.userDao.create(userBody)

      if (!userData) {
        message = 'Registration Failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      userData = userData.toJSON()
      delete userData.password

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        message,
        userData
      )
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Get user
   * @param {String} email
   * @returns {Object}
   */

  isEmailExists = async (email) => {
    const message = 'Email found!'
    if (!(await this.userDao.isEmailExists(email))) {
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Email not Found!!'
      )
    }
    return responseHandler.returnSuccess(httpStatus.OK, message)
  }

  getUserById = async (id) => {
    return this.userDao.findOneByWhere({ id })
  }

  changePassword = async (data, id) => {
    let message = 'Login Successful'
    let statusCode = httpStatus.OK
    let user = await this.userDao.findOneByWhere({ id })

    if (!user) {
      return responseHandler.returnError(
        httpStatus.NOT_FOUND,
        'User Not found!'
      )
    }

    if (data.password !== data.confirm_password) {
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Confirm password not matched'
      )
    }

    const isPasswordValid = await bcrypt.compare(
      data.old_password,
      user.password
    )
    user = user.toJSON()
    delete user.password
    if (!isPasswordValid) {
      statusCode = httpStatus.BAD_REQUEST
      message = 'Wrong old Password!'
      return responseHandler.returnError(statusCode, message)
    }
    const updateUser = await this.userDao.updateWhere(
      { password: bcrypt.hashSync(data.password, 8) },
      { id }
    )

    if (updateUser) {
      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Password updated Successfully!',
        {}
      )
    }

    return responseHandler.returnError(
      httpStatus.BAD_REQUEST,
      'Password Update Failed!'
    )
  }

  getLichessUserById = async (lichessUserId) => {
    try {
      console.log('Lichess Profile User Id = ', lichessUserId);
      const lichessProfile = await this.lichessDao.findByLichessId(lichessUserId)
      console.log('Lichess Profile = ', lichessProfile);
      return lichessProfile
    } catch (e) {
      console.log('Failed to fetch lichess profile')
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }
}

module.exports = UserService
