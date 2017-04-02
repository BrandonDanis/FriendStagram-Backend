process.env.NODE_ENV = "test";

const db = require('pg-bricks').configure(process.env.TEST_DB_URL);
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../index');
const should = chai.should();

chai.use(chaiHttp);

describe("Heartbeat", () => {
    it("Checking if server is alive", (done) => {
        chai.request(server)
            .get('/ping')
            .end((err, res) => {
                res.should.have.status(200)
                done()
            })
    })
})

describe("Users", () => {

    beforeEach((done) => {
        db.raw("DELETE FROM USERS_SESSIONS").rows((err,rows) => {
            db.raw("DELETE FROM POSTS").rows((err,rows) => {
                db.raw("DELETE FROM USERS").rows((err,rows) => {
                    done()
                })
            })
        })
    })

    it("POST /users | Should create a new user", (done) => {
        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        AddUser(user, () => {
            done()
        })
    })

    it("POST /users | Should not create a new user with already existing username", (done) => {
        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        let invalidUser = {
            "username": "brando",
            "password": "brando",
            "email": "brando1@brando.com",
            "name": "Brandon Danis"
        }

        AddUser(user, () => {
            AddInvalidUser(invalidUser, () => {
                done()
            })
        })
    })

    it("POST /users | Should not create a new user with already existing email", (done) => {
        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        let invalidUser = {
            "username": "brando1",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        AddUser(user, () => {
            AddInvalidUser(invalidUser, () => {
                done()
            })
        })
    })

    it("GET /users/:username | Should give us the users info", (done) => {
        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        AddUser(user, () => {
            chai.request(server)
                .get(`/users/${user.username}`)
                .end((err,res) => {
                    res.should.have.status(202)
                    res.body.should.be.a('object')
                    res.body.should.have.property('error')
                    res.body.should.have.property('error').eql(false)
                    res.body.should.have.property('data')
                    res.body.data.should.have.property('name')
                    res.body.data.should.have.property('name').eql(`${user.name}`)
                    res.body.data.should.have.property('username')
                    res.body.data.should.have.property('username').eql(`${user.username}`)
                    res.body.data.should.have.property('datecreated')
                    res.body.data.should.have.property('description')
                    res.body.data.should.have.property('posts')
                    res.body.data.posts.should.be.a('array')
                    res.body.data.posts.length.should.be.eql(0)
                    done()
                })
        })
    })

    it("POST /users/login | Should login user", (done) => {
        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        AddUser(user, () => {
            chai.request(server)
                .post("/users/login")
                .send(user)
                .end((err,res) => {
                    res.should.have.status(200)
                    res.body.should.be.a('object')
                    res.body.should.have.property('error')
                    res.body.should.have.property('error').eql(false)
                    res.body.should.have.property('data')
                    res.body.data.should.be.a("string")
                    done()
                })
        })

    })

})

describe("Posts", () => {

    beforeEach((done) => {
        db.raw("DELETE FROM USERS_SESSIONS").rows((err,rows) => {
            db.raw("DELETE FROM POSTS").rows((err,rows) => {
                db.raw("DELETE FROM USERS").rows((err,rows) => {
                    done()
                })
            })
        })
    })

    it("GET /posts | Should return empty list of posts", (done) => {
        chai.request(server)
            .get("/posts")
            .end((err,res) => {
                res.should.have.status(200)
                res.body.should.be.a('object')
                res.body.should.have.property('error')
                res.body.should.have.property('error').eql(false)
                res.body.should.have.property('data')
                res.body.data.should.be.a("array")
                res.body.data.length.should.be.eql(0)
                done()
            })
    })

    it("POST /posts | Should submit a new post", (done) => {

        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        let post = {
            "url": "myurl.png",
            "description": "Test Desc",
            "tags": "Tags"
        }

        AddUser(user, () => {
            LoginUser(user, (token) => {
                SubmitPost(post, token, () => {
                    chai.request(server)
                        .get("/posts")
                        .end((err,res) => {
                            res.should.have.status(200)
                            res.body.should.be.a('object')
                            res.body.should.have.property('error')
                            res.body.should.have.property('error').eql(false)
                            res.body.should.have.property('data')
                            res.body.data.should.be.a("array")
                            res.body.data.length.should.be.eql(1)
                            res.body.data[0].should.have.property('description')
                            res.body.data[0].should.have.property('description').eql(post.description)
                            res.body.data[0].should.have.property('image_url')
                            res.body.data[0].should.have.property('image_url').eql(post.url)
                            res.body.data[0].should.have.property('username')
                            res.body.data[0].should.have.property('username').eql(user.username)
                            done()
                        })
                })
            })

        })

    })

    it("GET /posts/id/:id | Should get a post by id", (done) => {

        let user = {
            "username": "brando",
            "password": "brando",
            "email": "brando@brando.com",
            "name": "Brandon Danis"
        }

        let post = {
            "url": "myurl.png",
            "description": "Test Desc",
            "tags": "Tags"
        }

        AddUser(user, () => {
            LoginUser(user, (token) => {
                SubmitPost(post, token, (post_info) => {
                    chai.request(server)
                        .get(`/posts/id/${post_info.id}`)
                        .end((err,res) => {
                            res.should.have.status(200)
                            res.body.should.be.a('object')
                            res.body.should.have.property('error')
                            res.body.should.have.property('error').eql(false)
                            res.body.should.have.property('data')
                            res.body.data.should.have.property('description')
                            res.body.data.should.have.property('description').eql(post.description)
                            res.body.data.should.have.property('image_url')
                            res.body.data.should.have.property('image_url').eql(post.url)
                            done()
                        })
                })
            })
        })

    })

})

AddUser = (user, callback) => {
    chai.request(server)
        .post("/users/")
        .send(user)
        .end((err,res) => {
            res.should.have.status(201)
            res.body.should.be.a('object')
            res.body.should.have.property('error')
            res.body.should.have.property('error').eql(false)
            callback()
        })
}

AddInvalidUser = (user, callback) => {
    chai.request(server)
        .post("/users/")
        .send(user)
        .end((err,res) => {
            res.should.have.status(500)
            res.body.should.be.a('object')
            res.body.should.have.property('error')
            res.body.should.have.property('error').eql(true)
            callback()
        })
}

LoginUser = (user, callback) => {
    chai.request(server)
        .post("/users/login")
        .send(user)
        .end((err,res) => {
            res.should.have.status(200)
            res.body.should.be.a('object')
            res.body.should.have.property('error')
            res.body.should.have.property('error').eql(false)
            res.body.should.have.property('data')
            callback(res["body"]["data"])
        })
}

SubmitPost = (post, token, callback) => {
    chai.request(server)
        .post("/posts")
        .set('token', token)
        .send(post)
        .end((err,res) => {
            res.should.have.status(200)
            res.body.should.be.a('object')
            res.body.should.have.property('error')
            res.body.should.have.property('error').eql(false)
            callback(res["body"]["data"])
        })
}
