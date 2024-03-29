const pool = require("../database");
const { uploadFile, deleteFile } = require("../services/s3");
const { sendDeleteAccountConfirmation } = require("../services/sendgrid");
const { verifyDeleteAccountToken } = require("../services/jwt");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  ApolloError,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
} = require("apollo-server-express");

/* ========== Query Resolvers ========== */

exports.getUser = async (parent, args) => {
  try {
    const username = args.username;

    const query = await pool.query(
      `SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE v_username = LOWER($1)`,
      [username]
    );

    const user = query.rows[0];

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.getAuthUser = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = authUser.user_id;

    const query = await pool.query(
      `SELECT user_id, email, username, created_at, profile_pic_src 
      FROM users 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const user = query.rows[0];

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get following
exports.getFollowing = async (parent) => {
  try {
    const user_id = parent.user_id;

    const query = await pool.query(
      `SELECT user_id, username, created_at, profile_pic_src
      FROM follows
        INNER JOIN users
        ON (followed_id = user_id)
      WHERE follower_id = ($1)`,
      [user_id]
    );

    const following = query.rows;

    return following;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get followers
exports.getFollowers = async (parent) => {
  try {
    const user_id = parent.user_id;

    const query = await pool.query(
      `SELECT user_id, username, created_at, profile_pic_src
      FROM follows
        INNER JOIN users
        ON (follower_id = user_id)
      WHERE followed_id = ($1)`,
      [user_id]
    );

    const followers = query.rows;

    return followers;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get user's posts
exports.getUserPosts = async (parent) => {
  try {
    const user_id = parent.user_id;

    const query = await pool.query(
      `SELECT type, post_id, title, description, media_src, created_at, 
        user_id, community_id, age(now(), created_at) 
      FROM posts 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const posts = query.rows;

    return posts;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get authenticated user's comments
exports.getUserComments = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  if (parent.user_id !== authUser.user_id) {
    throw new ForbiddenError("User not authorized");
  }

  try {
    const user_id = authUser.user_id;

    const query = await pool.query(
      `SELECT comment_id, parent_comment_id, post_id, user_id, message, 
        age(now(), created_at) 
      FROM comments 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const comments = query.rows;

    return comments;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get authenticated user's saved posts
exports.getSavedPosts = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  if (parent.user_id !== authUser.user_id) {
    throw new ForbiddenError("User not authorized");
  }

  try {
    const user_id = authUser.user_id;

    const query = await pool.query(
      `SELECT type, post_id, title, description, media_src, created_at, 
        user_id, community_id, age(now(), created_at) 
      FROM posts 
      WHERE post_id IN (
        SELECT post_id 
        FROM saved_posts 
        WHERE user_id = ($1)
      )`,
      [user_id]
    );

    const savedPosts = query.rows;

    return savedPosts;
  } catch (error) {
    throw new ApolloError(error);
  }
};

/* ========== Mutation Resolvers ========== */

exports.follow = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const follower_id = authUser.user_id;
    const followed_username = args.username;

    const query = await pool.query(
      `WITH x AS (
      INSERT INTO follows (follower_id, followed_id) 
        SELECT ($1), user_id 
        FROM users 
        WHERE v_username = LOWER($2)
      ON CONFLICT ON CONSTRAINT follows_pkey 
      DO NOTHING
      )
      SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE v_username = LOWER($2)`,
      [follower_id, followed_username]
    );

    const followedUser = query.rows[0];

    return followedUser;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.unfollow = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const follower_id = authUser.user_id;
    const followed_username = args.username;

    const query = await pool.query(
      `WITH x AS (
      DELETE FROM follows
      WHERE follower_id = ($1) AND followed_id IN (
        SELECT user_id
        FROM users 
        WHERE v_username = LOWER($2)
      ))
      SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE v_username = LOWER($2)`,
      [follower_id, followed_username]
    );

    const unfollowedUser = query.rows[0];

    return unfollowedUser;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.removeFollower = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const followed_id = authUser.user_id;
    const follower_username = args.username;

    const query = await pool.query(
      `WITH x AS (
      DELETE FROM follows
      WHERE followed_id = ($1) AND follower_id IN (
        SELECT user_id
        FROM users 
        WHERE v_username = LOWER($2)
      ))
      SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE v_username = LOWER($2)`,
      [followed_id, follower_username]
    );

    const removedFollower = query.rows[0];

    return removedFollower;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.changeEmail = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = authUser.user_id;
    const password = args.password;
    const new_email = args.new_email;

    const userQuery = await pool.query(
      "SELECT password FROM users WHERE user_id = ($1)",
      [user_id]
    );

    const isCorrectPassword = await bcrypt.compare(
      password,
      userQuery.rows[0].password
    );

    if (!isCorrectPassword) {
      throw new UserInputError("Incorrect password");
    }

    const updateQuery = await pool.query(
      `UPDATE users 
      SET email = ($1) 
      WHERE user_id = ($2) 
      RETURNING user_id, email, username, created_at, profile_pic_src, (
          SELECT email 
          FROM users 
          WHERE user_id = ($2)
        ) 
        AS old_email`,
      [new_email, user_id]
    );

    const user = updateQuery.rows[0];

    // TODO: send email notification that email has been changed

    return user;
  } catch (error) {
    if (error.constraint === "users_email_unique") {
      throw new UserInputError("Email is already registered");
    } else {
      throw new ApolloError(error);
    }
  }
};

exports.changeUsername = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const username = args.username;
    const user_id = authUser.user_id;

    const query = await pool.query(
      `UPDATE users 
      SET username = ($1) 
      WHERE user_id = ($2) 
      RETURNING user_id, email, username, created_at, profile_pic_src`,
      [username, user_id]
    );

    const user = query.rows[0];

    // TODO: send email notification that username has been changed

    return user;
  } catch (error) {
    if (error.constraint === "users_username_unique") {
      throw new UserInputError("Username is already taken");
    } else {
      throw new ApolloError(error);
    }
  }
};

exports.changeProfilePic = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = authUser.user_id;

    const uploadedFile = await uploadFile(args.profile_pic);
    const profile_pic_src = `/media/${uploadedFile.Key}`;

    const query = await pool.query(
      `UPDATE users 
      SET profile_pic_src = ($1) 
      WHERE user_id = ($2) 
      RETURNING user_id, email, username, created_at, profile_pic_src, (
          SELECT profile_pic_src 
          FROM users 
          WHERE user_id = ($2)
        ) 
        AS old_profile_pic_src`,
      [profile_pic_src, user_id]
    );

    const user = query.rows[0];

    if (user.old_profile_pic_src) {
      const key = user.old_profile_pic_src.split("/")[2];
      await deleteFile(key);
    }

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.changePassword = async (parent, args, context) => {
  const { isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = authUser.user_id;
    const current_password = args.current_password;
    const new_password = args.new_password;

    const userQuery = await pool.query(
      "SELECT password FROM users WHERE user_id = ($1)",
      [user_id]
    );

    const isCorrectPassword = await bcrypt.compare(
      current_password,
      userQuery.rows[0].password
    );

    if (!isCorrectPassword) {
      throw new UserInputError("Incorrect password");
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    const updateQuery = await pool.query(
      `UPDATE users 
      SET password = ($1) 
      WHERE user_id = ($2) 
      RETURNING user_id, email, username, created_at, profile_pic_src`,
      [hashedNewPassword, user_id]
    );

    const user = updateQuery.rows[0];

    // TODO: send email notification that password has been changed

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.deleteAccount = async (parent, args, context) => {
  const { res, isAuthenticated, authUser } = context;

  if (!isAuthenticated) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = authUser.user_id;
    const password = args.password;

    // Check if password is correct
    const passwordQuery = await pool.query(
      `SELECT password 
      FROM users 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const isCorrectPassword = await bcrypt.compare(
      password,
      passwordQuery.rows[0].password
    );

    if (!isCorrectPassword) {
      throw new UserInputError("Incorrect password");
    }

    // If password is correct, delete account
    const deleteQuery = await pool.query(
      `DELETE FROM users
      WHERE user_id = ($1)
      RETURNING profile_pic_src`,
      [user_id]
    );

    const user = deleteQuery.rows[0];

    if (user && user.profile_pic_src) {
      const key = user.profile_pic_src.split("/")[2];
      await deleteFile(key);
    }

    // Delete auth cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return { success: true };
  } catch (error) {
    throw new ApolloError(error);
  }
};
