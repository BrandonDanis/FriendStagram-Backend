const config = require('../config')
const db = require('pg-bricks').configure(config[process.env.NODE_ENV || 'development']);
const bcrypt = require('bcrypt-nodejs')
const saltRounds = config['saltRounds']
const uuid = require('uuid')
const Rx = require('rx')

module.exports.register = (username, unHashedPassword, email, name) => {
    return Rx.Observable.create(observer => observer.onNext(bcrypt.genSaltSync(saltRounds)))
        .flatMap(salt => {
            return Rx.Observable.create(observer => {
                bcrypt.hash(unHashedPassword, salt, null, (err, password) => {
                    if (err)
                        observer.onError(err);
                    else
                        observer.onNext(password);
                    observer.onCompleted();
                });
            });
        }).flatMap(password => {
            return Rx.Observable.create(observer => {
                db.insert('users', {username, password, email, name}).run(err => {
                    if (err)
                        observer.onError(err);
                    else
                        observer.onNext({username});
                    observer.onCompleted();
                });
            })
        });
};

module.exports.findUser = (username) => {
    const userObservable = Rx.Observable.create(observer => {
        db.select(['name', 'username', 'datecreated', 'description', 'profile_picture_url', 'profile_background_url']).from('users').where({'username': username}).row((err, row) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(row);
            observer.onCompleted();
        });
    });
    const postsObservable = Rx.Observable.create(observer => {
        db.raw('SELECT * FROM posts WHERE user_id = (SELECT id FROM users WHERE username  = $1) ORDER BY id DESC;', [username]).rows((err, rows) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(rows);
            observer.onCompleted();
        })
    });
    const followersObservable = Rx.Observable.create(observer => {
        db.raw("SELECT uf.follower FROM users_follows uf JOIN users u ON uf.following = u.id WHERE uf.following = (SELECT id FROM users WHERE username = $1);", [username]).rows((err,rows) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(rows.map(row => row.follower));
            observer.onCompleted();
        })
    }).flatMap(followerIDs => {
        return Rx.Observable.create(observer => {
            if (followerIDs.length === 0) {
                observer.onNext([]);
                observer.onCompleted();
            } else {
                const params = followerIDs.map((id, index) => `\$${index + 1}`).join(', ');
                db.raw(`SELECT username FROM users WHERE id IN (${params})`, followerIDs).rows((err, rows) => {
                    if (err)
                        observer.onError(err);
                    else
                        observer.onNext(rows);
                    observer.onCompleted();
                });
            }
        });
    });
    const followingObservable = Rx.Observable.create(observer => {
        db.raw("SELECT uf.following FROM users_follows uf JOIN users u ON uf.follower = u.id WHERE uf.follower = (SELECT id FROM users WHERE username = $1);", [username]).rows((err,rows) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(rows.map(row => row.following));
            observer.onCompleted();
        })
    }).flatMap(followingIDs => {
        return Rx.Observable.create(observer => {
            if (followingIDs.length === 0) {
                observer.onNext([]);
                observer.onCompleted();
            } else {
                const params = followingIDs.map((id, index) => `\$${index + 1}`).join(', ');
                db.raw(`SELECT username FROM users WHERE id IN (${params})`, followingIDs).rows((err, rows) => {
                    if (err)
                        observer.onError(err);
                    else
                        observer.onNext(rows);
                    observer.onCompleted();
                });
            }
        })
    });
    return Rx.Observable.forkJoin(userObservable, postsObservable, followersObservable, followingObservable);
};

module.exports.findAllUsers = () => {
    return Rx.Observable.create(observer => {
        db.select(['id', 'name', 'datecreated', 'email', 'description']).from('users').rows((err, rows) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(rows);
            observer.onCompleted();
        });
    });
}

module.exports.authenticate = (id, uuid) => {
    const getUserObservable = Rx.Observable.create(observer => {
        db.select('id').from('users').where({id}).row((err, row) => {
            if (err)
                observer.onError({error: err, table: 'users'});
            else
                observer.onNext(row);
            observer.onCompleted();
        });
    });

    const getUserSessionsObservable = Rx.Observable.create(observer => {
        db.select('id').from('users_sessions').where({'id': uuid}).row((err, row) => {
            if (err)
                observer.onError({error: err, table: 'users_sessions'});
            else
                observer.onNext(row);
            observer.onCompleted();
        });
    });

    return Rx.Observable.forkJoin(getUserObservable, getUserSessionsObservable);
}

module.exports.comparePasswordbyID = (id, password, callback) => {
    db.select(['password']).from('users').where({id}).row((err, row) => {
        if (err)
            callback(true);
        else
            bcrypt.compare(password, row.password, callback);
    });
}

module.exports.login = (username, password) => {
    return Rx.Observable.create((observer => {
        db.select(['username', 'password']).from('users').where({username}).row((err, row) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(row.password);
            observer.onCompleted();
        })
    })).flatMap(hashedPassword => {
        return Rx.Observable.create(observer => {
            bcrypt.compare(password, hashedPassword, (err, res) => {
                if (err || !res) {
                    observer.onError('An error occurred. Please log in again!');
                    observer.onCompleted();
                } else {
                    db.raw('INSERT INTO users_sessions VALUES($1, (SELECT id FROM users WHERE username = $2)) RETURNING *;', [uuid.v4(), username]).row((err, row) => {
                        if (err)
                            observer.onError(err);
                        else
                            observer.onNext(row);
                        observer.onCompleted();
                    });
                }
            });
        });
    });
}

module.exports.changePassword = (id, password, newPassword, callback) => {
    module.exports.comparePasswordbyID(id, password, (err, ok) => {
        if (ok) {
            const salt = bcrypt.genSaltSync(saltRounds);
            bcrypt.hash(newPassword, salt, null, (err, hashedPassword) => {
                if (err) {
                    console.error(err);
                    callback(true, 'An error occurred. Please try again')
                } else {
                    db.update('users').set('password', hashedPassword).where({id}).run(err => {
                        callback(err);
                    });
                }
            })
        }
        else
            callback(true, 'Password Was Incorrect')
    })
}

module.exports.logOff = (id) => {
    return Rx.Observable.create(observer => {
        db.delete('users_sessions').where({id}).run((err) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext('');
            observer.onCompleted();
        })
    });
}

module.exports.logOffAllOtherSessions = (id, requestedSession) => {
    return Rx.Observable.create(observer => {
        db.raw('DELETE FROM users_sessions WHERE id NOT IN ($1) AND user_id = $2', [requestedSession, id]).run(err => {
            if (err)
                observer.onError(err);
            else
                observer.onNext('');
            observer.onCompleted();
        });
    });
}

//POST METHODS

/*module.exports.findUserPostsbyID = (id) => {
    return Rx.Observable.create(observer => {
        db.select('id').from('posts').where({'user_id': id}).rows((err, rows) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(rows);
            observer.onCompleted();
        });
    });
}*/

module.exports.authorizedToDelete = (postID, id) => {
    return Rx.Observable.create(observer => {
        db.select('user_id').from('posts').where({'id': postID, 'user_id': id}).row((err, row) => {
            if (err)
                observer.onError(err);
            else
                observer.onNext(row);
            observer.onCompleted();
        });
    });
}

/*module.exports.removePost = (post, _id, callback) => {
    user.update({_id}, {$pull: {posts: post}}, callback)
}*/

module.exports.delete = (id) => {
    return Rx.Observable.create(observer => {
        db.delete().from('users').where({id}).run(err => {
            if (err)
                observer.onError(err);
            else
                observer.onNext('');
            observer.onCompleted();
        });
    });
}

module.exports.updateProfilePicture = (userId, image_url) => {
    return Rx.Observable.create(observer => {
        db.update('users', {profile_picture_url: image_url}).where('id', userId).run((err) => {
            if(err){
                observer.onError(err)
            }else{
                observer.onNext()
            }
            observer.onCompleted()
        })
    })
}

module.exports.updateBackgroundPicture = (userId, image_url) => {
    return Rx.Observable.create(observer => {
        db.update('users', {profile_background_url: image_url}).where('id', userId).run((err) => {
            if(err){
                observer.onError(err)
            }else{
                observer.onNext()
            }
            observer.onCompleted()
        })
    })
}
