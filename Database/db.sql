CREATE EXTENSION pg_trgm;

CREATE TABLE IF NOT EXISTS users (
  id                        SERIAL,
  name                      VARCHAR(35),
  username                  VARCHAR(25)  NOT NULL UNIQUE,
  password                  VARCHAR(100) NOT NULL,
  datecreated               TIMESTAMP    NOT NULL DEFAULT (NOW()),
  email                     VARCHAR(254) NOT NULL UNIQUE,
  description               VARCHAR(250),
  dailyLimit                INTEGER,
  profile_picture_url       VARCHAR(250),
  profile_background_url    VARCHAR(250),
  verified                  BOOLEAN      NOT NULL DEFAULT FALSE,
  UNIQUE (username, email),
  PRIMARY KEY (id)
);
CREATE INDEX users_name_trigram_idx ON users USING GIST (name gist_trgm_ops);
CREATE INDEX users_username_trigram_idx ON users USING GIST (username gist_trgm_ops);

CREATE TABLE IF NOT EXISTS users_sessions (
    id UUID     NOT NULL,
    user_id     INTEGER NOT NULL,
    PRIMARY KEY (id, user_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users_follows (
    follower    INTEGER NOT NULL,
    following   INTEGER NOT NULL,
    PRIMARY KEY (follower, following),
    FOREIGN KEY (follower) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (following) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id   SERIAL,
  name VARCHAR,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL,
  description VARCHAR(250),
  user_id     INTEGER,
  tag_id      INTEGER,
  image_url   VARCHAR(255) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags (id),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_tags (
  id      SERIAL,
  post_id INTEGER,
  tag_id  INTEGER,
  FOREIGN KEY (post_id) REFERENCES posts (id),
  FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (id)
);
