const Post = require("../models/Post");

// @desc Get all posts
// @route GET /api/v1/posts
// @access Public
exports.getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find();

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// @desc Add a post
// @route POST /api/v1/posts
// @access Public
exports.addPost = async (req, res, next) => {
  try {
    const message = req.body.message;

    const post = await Post.create({
      message: message,
      postedOn: Date.now(),
    });
    const savedPost = await post.save();

    return res.status(200).json({
      success: true,
      data: savedPost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};