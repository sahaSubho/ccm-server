const httpStatus = require('http-status')
const AuthService = require('../service/AuthService')
const TokenService = require('../service/TokenService')
const UserService = require('../service/UserService')
const logger = require('../config/logger')
const { tokenTypes } = require('../config/tokens')

class AuthController {
  constructor() {
    this.userService = new UserService()
    this.tokenService = new TokenService()
    this.authService = new AuthService()
  }

  register = async (req, res) => {
    try {
      const user = await this.userService.createUser(req.body)
      let tokens = {}
      const { status } = user.response
      if (user.response.status) {
        tokens = await this.tokenService.generateAuthTokens(user.response.data)
      }

      const { message, data } = user.response
      res.status(user.statusCode).send({ status, message, data, tokens })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  checkEmail = async (req, res) => {
    try {
      const isExists = await this.userService.isEmailExists(
        req.body.email.toLowerCase()
      )
      res.status(isExists.statusCode).send(isExists.response)
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  login = async (req, res) => {
    try {
      const { email, password } = req.body
      const user = await this.authService.loginWithEmailPassword(
        email.toLowerCase(),
        password
      )
      const { message } = user.response
      const { data } = user.response
      const { status } = user.response
      const code = user.statusCode
      let tokens = {}
      if (user.response.status) {
        tokens = await this.tokenService.generateAuthTokens(data)
      }
      res.status(user.statusCode).send({ status, code, message, data, tokens })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  logout = async (req, res) => {
    await this.authService.logout(req, res)
    res.status(httpStatus.NO_CONTENT).send()
  }

  refreshTokens = async (req, res) => {
    try {
      const refreshTokenDoc = await this.tokenService.verifyToken(
        req.body.refresh_token,
        tokenTypes.REFRESH
      )
      const user = await this.userService.getUserById(refreshTokenDoc.user_id)
      if (user == null) {
        res.status(httpStatus.BAD_GATEWAY).send('User Not Found!')
      }
      await this.tokenService.removeTokenById(refreshTokenDoc.id)
      const tokens = await this.tokenService.generateAuthTokens(user)
      res.send(tokens)
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  changePassword = async (req, res) => {
    try {
      const responseData = await this.userService.changePassword(
        req.body,
        req.user.id
      )
      res.status(responseData.statusCode).send(responseData.response)
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getUserDetails = async (req, res, next) => {
    try {
      const { user } = req
      // const tokenDoc = await this.tokenService.verifyToken(
      //   req.body.token,
      //   tokenTypes.ACCESS
      // )
      // if (tokenDoc == null) {
      //   res
      //     .status(httpStatus.BAD_GATEWAY)
      //     .send('Token is expired Please Login again!')
      // }
      // const user = await this.userService.getUserById(tokenDoc.user_id)
      // if (user == null) {
      //   res.status(httpStatus.BAD_GATEWAY).send('User Not Found!')
      // }
      res.send({ data: user })
    } catch (e) {
      logger.error(e)
      next(e)
    }
  }

  getConnectedLichessAccount = async (req, res, next) => {
    try {
      const tokenDoc = await this.tokenService.verifyToken(
        req.body.token,
        tokenTypes.ACCESS
      )
      if (tokenDoc == null) {
        res
          .status(httpStatus.BAD_GATEWAY)
          .send('Token is expired Please Login again!')
      }
      let lichess_username = '' // to be populated from DB
      const user = await this.userService.getUserById(tokenDoc.user_id)
      if (user == null) {
        res.status(httpStatus.NOT_FOUND).send('User Not Found!')
      } else {
        lichess_username = user.lic_name
        if (lichess_username) {
          const lichessUser = await this.userService.getLichessUserById(
            lichess_username
          )
          if (lichessUser && lichessUser.lichess_token) {
            // the user has lichess account integrated
            // TODO: Here we should put an additional logic to validate the token
            res.send({ data: { lichess_username, connected: true } })
          } else {
            res.send({ data: { connected: false } })
          }
        } else {
          res.send({ data: { connected: false } })
        }
      }
    } catch (e) {
      logger.error(e)
      next(e)
    }
  }

  connectLichessToUser = async (req, res, next) => {
    try {
      const tokenDoc = await this.tokenService.verifyToken(
        req.body.token,
        tokenTypes.ACCESS
      )
      if (tokenDoc == null) {
        res
          .status(httpStatus.BAD_GATEWAY)
          .send('Token is expired Please Login again!')
      }

      const { lichess_username } = req.body

      const user = await this.userService.updateLichessUserDetails(
        tokenDoc.user_id,
        lichess_username
      )

      if (user == null) {
        res.status(httpStatus.NOT_FOUND).send('User Not Found!')
      } else {
        res.status(httpStatus.OK).send({ data: user })
      }
    } catch (e) {
      logger.error(e)
      next(e)
    }
  }
}

module.exports = AuthController
