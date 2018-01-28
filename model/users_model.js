const bcrypt = require('bcrypt')
const uuid = require('uuid')

const followModel = require('./follow_model')
const config = require('../config')
const db = require('pg-bricks').configure(config[process.env.NODE_ENV || 'development'])
const utils = require('../utils/util')
const {FSError} = require('../response-types')

// eslint-disable-next-line
const saltRounds = config.saltRounds

module.exports.register = async (username, unHashedPassword, email, name) => {
  const allTheSalt = await bcrypt.genSalt(saltRounds)
  const password = await bcrypt.hash(unHashedPassword, allTheSalt, null)
  try {
    return await db.insert('users', {username, password, email, name}).returning('*').row()
  } catch (e) {
    if (e.code === '23505') {
      throw FSError.fieldAlreadyExists({detail: `${utils.capitalize(e.detail.match(/[a-zA-Z]+(?=\))/)[0])} already exists`})
    }
  }
}

module.exports.findUserByUsername = async (username) => {
  const userPromise = db.select([
    'id',
    'name',
    'username',
    'datecreated',
    'description',
    'profile_picture_url',
    'profile_background_url'
  ]).from('users').where({username}).row()

  const postsPromise = db.raw(
    'SELECT * FROM posts WHERE user_id = (SELECT id FROM users WHERE username  = $1) ORDER BY id DESC;',
    [username]
  ).rows()

  try {
    const [user, posts] = await Promise.all([userPromise, postsPromise])
    const followersPromise = followModel.getAllFollowers(user.id)
    const followingPromise = followModel.getAllFollowing(user.id)
    delete user.id

    const [followers, following] = await Promise.all([followersPromise, followingPromise])
    return [user, posts, followers, following]
  } catch (e) {
    if (e.message === 'Expected a row, none found') { // user not found
      throw FSError.userDoesNotExist({detail: 'User not found'})
    }
  }
}

module.exports.findUserByID = async (id) => {
  try {
    const {username} = await db.select('username').from('users').where({id}).row()
    return module.exports.findUserByUsername(username)
  } catch (e) {
    if (e.message === 'Expected a row, none found') { // user not found
      throw FSError.userDoesNotExist({detail: 'User not found'})
    }
  }
}

module.exports.findAllUsers = () => db.select(
  ['id', 'username', 'name', 'datecreated', 'email', 'description'])
  .from('users')
  .rows()

module.exports.authenticate = async (id, sessionID) => {
  try {
    await db.select('id').from('users').where({id}).row()
  } catch (e) {
    throw FSError.userDoesNotExist()
  }

  try {
    await db.select('id').from('users_sessions').where({id: sessionID}).row()
  } catch (e) {
    throw FSError.userIsNotLoggedIn()
  }
}

module.exports.comparePasswordByID = async (id, password) => {
  const row = await db.select(['password']).from('users').where({id}).row()
  return bcrypt.compare(password, row.password)
}

module.exports.login = async (username, password) => {
  const {id: userID, password: hashedPassword, verified, profile_picture_url} = await db
    .select(['id', 'password', 'verified', 'profile_picture_url'])
    .from('users')
    .where({username})
    .row()
  const validPassword = await bcrypt.compare(password, hashedPassword)

  if (!validPassword) {
    throw FSError.invalidPassword()
  }

  const uuidStr = uuid.v4()
  await db.raw('INSERT INTO users_sessions VALUES ($1, $2);', [uuidStr, userID]).run()
  return {id: uuidStr, user_id: userID, verified, profile_picture_url}
}

module.exports.changePassword = async (id, password, newPassword) => {
  const passwordMatch = await module.exports.comparePasswordByID(id, password)
  if (!passwordMatch) {
    throw FSError.invalidPassword()
  }

  const allTheSalt = await bcrypt.genSalt(saltRounds)
  const hashedPassword = await bcrypt.hash(newPassword, allTheSalt, null)

  return db.update('users').set('password', hashedPassword).where({id}).run()
}

module.exports.changeUser = async (id, updateObj) => {
  const {old_password: oldPassword, new_password: newPassword} = updateObj
  const passwordMatch = await module.exports.comparePasswordByID(id, oldPassword)
  if (!passwordMatch) {
    throw FSError.invalidPassword()
  }

  const promises = []
  if (newPassword) {
    promises.push(module.exports.changePassword(id, oldPassword, newPassword))
  }
  delete updateObj.old_password
  delete updateObj.new_password

  const keys = Object.keys(updateObj)
  const query = `UPDATE users SET ${keys.map((key, index) => `${key} = $${index + 1}`).join(', ')} WHERE id = $${keys.length + 1};`
  const params = keys.map(key => updateObj[key])
  params.push(id)
  promises.push(db.raw(query, params).run())

  await Promise.all(promises)
}

module.exports.search = query => db.raw('SELECT username, name, email, profile_picture_url FROM users, similarity(name, $1) AS name_similarity, similarity(username, $1) AS username_similarity WHERE (name % $1 OR username % $1) AND profile_picture_url IS NOT NULL ORDER BY name_similarity DESC, username_similarity DESC', [query]).rows()

module.exports.logOff = id => db.delete('users_sessions').where({id}).run()

module.exports.logOffAllOtherSessions = (id, requestedSession) => db.raw(
  'DELETE FROM users_sessions WHERE id NOT IN ($1) AND user_id = $2',
  [requestedSession, id]).run()

module.exports.authorizedToDelete = async (postID, id) => {
  try {
    await db.select('user_id').from('posts').where({id: postID, user_id: id}).row()
  } catch (e) {
    if (e.message.indexOf('Expected a row') > -1) {
      throw FSError.unauthorized({detail: 'User does not have the right to delete this post'})
    }
  }
}

module.exports.delete = id => db.delete().from('users').where({id}).run()

module.exports.updateProfilePicture = (userId, imageURL) => db.update('users', {profile_picture_url: imageURL}).where('id', userId).run()

module.exports.updateBackgroundPicture = (userId, imageURL) => db.update('users', {profile_background_url: imageURL}).where('id', userId).run()
