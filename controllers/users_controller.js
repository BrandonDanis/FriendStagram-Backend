const user = require('../model/users_model')
const utils = require('../utils/util')
const jwt = require('jwt-simple')
const cfg = require('../config')

module.exports.findAllUsers = (req, res) => {
    user.findAllUsers().subscribe(
        users =>
            res.status(200).json({
                error: false,
                users: users
            }),
        err =>
            res.status(404).json({
                error: true,
                users: []
            })
    )
}

module.exports.register = ({body: {username = null, password = null, email = null, name = null}}, res) => {
    let errorMessage = '';

    if (utils.isEmpty(username)) {
        errorMessage += 'Username is Null\n'
    }
    if (utils.isEmpty(password)) {
        errorMessage += 'Password is Null\n'
    }
    if (utils.isEmpty(email)) {
        errorMessage += 'Email is Null\n'
    }
    if (utils.isEmpty(name)) {
        errorMessage += 'Name is Null\n'
    }

    if (!utils.isEmpty(errorMessage)) {
        res.status(401).json({
            error: true,
            data: errorMessage
        })
    }
    else {
        user.register(username, password, email, name).subscribe(
            id =>
                res.status(201).json({
                    error: false,
                    data: id
                }),
            err => {
                let message = '';
                //noinspection EqualityComparisonWithCoercionJS
                if (err.code == 23505) {
                    message = `${utils.capitalize(err.detail.match(/[a-zA-Z]+(?=\))/)[0])} already exists`;
                }
                res.status(500).json({
                    error: true,
                    data: message
                })
            })
    }
}

module.exports.findUser = ({params: {username = null}}, res) => {
    const observable = user.findUser(username);
    observable.subscribe(
        next => {
            let [user, posts, followers, following] = next;
            posts.map(post => {
                post.user = {
                    username: user.username,
                    profile_picture_url: user.profile_picture_url,
                    name: user.name
                };
                return post;
            });
            user.posts = posts;
            user.followers = followers;
            user.following = following;
            res.status(202).json({
                error: false,
                data: user
            })
        },
        err => {
            res.status(400).json({
                error: true,
                data: err
            })
        }
    )
}

module.exports.login = ({body: {username = null, password = null}}, res) => {
    let errorMessage = '';

    if (utils.isEmpty(username)) {
        errorMessage += 'Username is Null\n'
    }
    if (utils.isEmpty(password)) {
        errorMessage += 'Password is Null\n'
    }

    if (!utils.isEmpty(errorMessage)) {
        res.status(401).json({
            error: true,
            data: errorMessage
        });
    } else {
        //check cache here
        const observable = user.login(username, password);

        observable.subscribe(
            next => {
                const payload = {
                    id: next.user_id,
                    timestamp: new Date(),
                    uuid: next.id
                };
                const token = jwt.encode(payload, cfg.jwtSecret);
                res.status(200).json({
                    error: false,
                    data: token
                })
            },
            () => {
                res.status(404).json({
                    error: true,
                    data: 'Username and Password combination does not exist'
                })
            }
        )
    }
}

module.exports.changeUser = ({body: {password = null}, user: {id = -1}}, res) => {
    if (password !== null) {
        user.changePassword(id, password.old, password.new, (err, ok) => {
            if (err) {
                return res.status(404).json({
                    error: true,
                    data: 'Wrong Password'
                })
            } else {
                return res.status(200).json({
                    error: null,
                    data: 'Successfully Changed Password'
                })
            }
        })
    } else {
        res.status(404).json({
            error: true,
            data: 'No Change Requested'
        })
    }
}

module.exports.logOff = (req, res) => {
    const logOffObservable = user.logOff(req.user.uuid);
    logOffObservable.subscribe(
        () => res.status(200).json({
            error: false,
            data: null
        }),
        err => {
            console.error(err);
            res.status(400).json({
                error: true,
                data: null
            });
        }
    );
}

module.exports.logOffAllOtherSessions = (req, res) => {
    const logOffObservable = user.logOffAllOtherSessions(req.user.id, req.user.uuid);
    logOffObservable.subscribe(
        () => res.status(200).json({
            error: false,
            data: null
        }),
        err => {
            console.error(err);
            res.status(400).json({
                error: true,
                data: null
            })
        }
    )
}

module.exports.delete = (req, res) => {
    user.comparePasswordbyID(req.user.id, req.body.password, (err, ok) => {
        if (ok) {
            const deleteUserObservable = user.delete(req.user.id);
            deleteUserObservable.subscribe(
                () => {
                    res.status(200).json({
                        error: true,
                        data: 'Successfully deleted user'
                    })
                },
                err => {
                    console.error(err);
                    res.status(500).json({
                        error: true,
                        data: null
                    })
                }
            )
        }
        else
            res.status(403).json({
                error: true,
                data: "Password Was Incorrect"
            })
    })
}

module.exports.updateProfilePicture = ({user: {id = null}, body: {image_url = null} },res) => {
    const updateProfilePictureObservable = user.updateProfilePicture(id, image_url)
    updateProfilePictureObservable.subscribe(
        () => {
            res.status(200).json({
                error: false,
                data: 'Successfully update user profile'
            })
        },
        err => {
            res.status(500).json({
                error: true,
                data: 'Failed to update user profile'
            })
        }
    )
}

module.exports.updateBackgroundPicture = ({user: {id = null}, body: {image_url = null}},res) => {
    const updateBackgroundPictureObservable = user.updateBackgroundPicture(id, image_url)
    updateBackgroundPictureObservable.subscribe(
        () => {
            res.status(200).json({
                error: false,
                data: 'Successfully update user profile'
            })
        },
        err => {
            res.status(500).json({
                error: true,
                data: 'Failed to update user profile'
            })
        }
    )
}
