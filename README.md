# FriendStagram API
<img src="https://travis-ci.org/BrandonDanis/FriendStagram-API.svg?branch=master"></img><br>
Backend server for FriendStagram. Written with Javascript, Node.js & Postgres.

## Endpoints
### Users
```javascript
var users = 'routes/user-route.js';
GET /users //Returns all users & their posts
DELETE /users //Delete the user. Authenticated.
POST /users/login //Loging in. Return session token used for authentication
GET /users/logout //Deletes users session. Authenticated.
GET /users/logoffallothersessions //Deletes all other session tied to the account. Authenticated.
GET /users/:username //Return user info + posts about the specific user
```

### Posts
```javascript
var posts = 'routes/post-route.js';
GET /posts //Return all posts. Parameters available to sort,limit,offset and search
GET /posts/id/:id //Return info about post with specific id
POST /posts //Upload a post. Authenticated.
DELETE /posts //Ability to delete a post. Authenticated.
```

### Following
```javascript
var follows = 'routes/follow-routes.js';
GET /follow/getAllFollowing/:userId //Returns all users that this user follows
GET /follow/getAllFollowers/:userId //Returns all users that this user is followed by
POST /follow //Follow a user. Authenticated
DELETE /follow //Unfollows a user. Authenticated
```

## Features
- User sessions with JWT
- Password hashing using BCrypt
- Scalable
- Image hosting using Cloudinary

## Setup
1. Install [Docker](https://www.docker.com/) at your machine.
2. Pull the latest code
3. Build a friendstagram into a docker image
```
make build
```
4. Run
```
docker-compose -f docker-compose.yml up -d friendstagram
```


