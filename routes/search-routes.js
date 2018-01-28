const app = require('express').Router()
const searchController = require('../controllers/search_controller')

app.get('/users', searchController.searchUsers)

module.exports = app
