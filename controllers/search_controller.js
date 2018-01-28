const usersModel = require('../model/users_model')
const {Response} = require('../response-types')

module.exports.searchUsers = async ({query: {query}}, res, next) => {
  try {
    const results = await usersModel.search(query)
    return Response.OK(res, results)
  } catch (e) {
    next(e)
  }
}
