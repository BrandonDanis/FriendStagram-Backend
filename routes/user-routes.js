const app = require('express').Router()
const usersController = require('../controllers/users_controller')
const auth = require('../auth.js')

    app.get('/', usersController.findAllUsers)
    app.post('/', usersController.register)
    app.delete('/' , auth.authenticate, usersController.delete)

    app.post('/login', usersController.login)
    app.get('/logoff', auth.authenticate, usersController.logOff)
    app.get('/logoffallothersessions', auth.authenticate, usersController.logOffAllOtherSessions)

    app.put('/profile_picture', auth.authenticate, usersController.updateProfilePicture)
    app.put('/background_picture', auth.authenticate, usersController.updateBackgroundPicture)

    app.get('/:username', usersController.findUser)
    app.put('/:username', auth.authenticate, usersController.changeUser)

module.exports = app
