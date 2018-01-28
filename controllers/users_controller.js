const jwt = require('jwt-simple')
const jdenticon = require('jdenticon')

const userModel = require('../model/users_model')
const utils = require('../utils/util')
const cfg = require('../config')
const {Response, FSError} = require('../response-types')

module.exports.findAllUsers = async (req, res, next) => {
  try {
    const users = await userModel.findAllUsers()
    return Response.OK(res, users)
  } catch (e) {
    next(e)
  }
}

module.exports.register = async ({body}, res, next) => {
  const keys = ['username', 'password', 'email', 'name']
  const {username = null, password = null, email = null, name = null} = body

  const errors = utils.getMissingKeys(body, keys)
  if (!errors.isEmpty()) {
    return next(FSError.missingParameters({errors}))
  }

  try {
    const {id, datecreated} = await userModel.register(username, password, email, name)
    return Response.Created(res, {
      name, username, email, datecreated, id
    })
  } catch (e) {
    next(e)
  }
}

module.exports.findUser = async ({params: {username = null}}, res, next) => {
  try {
    const [userInfo, postInfo = [], followersInfo = [], followingInfo = []] = await userModel.findUserByUsername(username)
    userInfo.posts = postInfo.map((post) => {
      const newPost = post
      newPost.url = post.image_url
      newPost.user = {
        username: userInfo.username,
        profile_picture_url: userInfo.profile_picture_url,
        name: userInfo.name
      }
      return newPost
    })
    userInfo.followers = followersInfo
    userInfo.following = followingInfo
    return Response.Accepted(res, userInfo)
  } catch (e) {
    next(e)
  }
}

module.exports.login = async ({body}, res, next) => {
  const {username = null, password = null} = body

  const errors = utils.getMissingKeys(body, ['username', 'password'])
  if (!errors.isEmpty()) {
    return next(FSError.missingParameters({errors}))
  }

  try {
    const {id: uuid, user_id: userID, verified, profile_picture_url} = await userModel.login(username, password)
    const payload = {
      id: userID,
      timestamp: new Date(),
      uuid
    }
    const token = jwt.encode(payload, cfg.jwtSecret)
    return Response.OK(res, {token, verified, profile_picture_url})
  } catch (e) {
    if (e.message === 'Require key') {
      console.error('jwtSecret is missing')
      return next(FSError.unknown())
    }
    next(e)
  }
}

module.exports.changeUser = async ({user, body}, res, next) => {
  const {id} = user

  let errors = utils.getMissingKeys(user, [{key: 'id', name: 'user ID'}])
  errors = errors.concat(utils.getMissingKeys(body, [{key: 'old_password', name: 'old password'}]))
  if (!errors.isEmpty()) {
    return next(FSError.missingParameters({errors}))
  }

  try {
    await userModel.changeUser(id, body)
    return Response.OK(res, 'Successfully updated user')
  } catch (e) {
    next(e)
  }
}

module.exports.logOff = async ({user}, res, next) => {
  try {
    await userModel.logOff(user.uuid)
    return Response.OK(res, 'Successfully logged out')
  } catch (e) {
    next(e)
  }
}

module.exports.logOffAllOtherSessions = async (req, res, next) => {
  try {
    await userModel.logOffAllOtherSessions(req.user.id, req.user.uuid)
    return Response.OK(res, 'Successfully logged out of your other sessions')
  } catch (e) {
    next(e)
  }
}

module.exports.delete = async ({body: {password = null}, user = null}, res, next) => {
  const passwordMatch = await userModel.comparePasswordByID(user.id, password)
  if (!passwordMatch) {
    next(FSError.invalidPassword())
  }

  try {
    await userModel.delete(user.id)
    return Response.OK(res, 'Successfully deleted user')
  } catch (e) {
    next(e)
  }
}

module.exports.updateProfilePicture = async ({user: {id = null}, body: {image_url: imageURL = null}}, res, next) => {
  try {
    await userModel.updateProfilePicture(id, imageURL)
    return Response.OK(res, 'Successfully updated your user profile')
  } catch (e) {
    next(e)
  }
}

module.exports.updateBackgroundPicture = async ({user: {id = null}, body: {image_url: imageURL = null}}, res, next) => {
  try {
    await userModel.updateBackgroundPicture(id, imageURL)
    return Response.OK(res, 'Successfully updated your user profile')
  } catch (e) {
    next(e)
  }
}

module.exports.getDefaultProfilePicture = async ({query: {username = null}}, res, next) => {
  try {
    const [{datecreated}] = await userModel.findUserByUsername(username)
    const today = new Date()
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': `max-age=${60 * 60 * 24 * 365}`,
      'Expires': new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
      'Last-Modified': datecreated
    }).send(jdenticon.toPng(username, 500))
  } catch (e) {
    next(e)
  }
}
