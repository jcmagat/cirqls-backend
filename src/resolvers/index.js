const { register, login } = require("./auth");
const {
  getAllPosts,
  getPostById,
  addPost,
  deletePost,
  likePost,
} = require("./post");

const resolvers = {
  Query: {
    posts: getAllPosts,
    post: getPostById,
  },

  Mutation: {
    // Auth mutations
    register: register,
    login: login,

    // Post mutations
    addPost: addPost,
    deletePost: deletePost,
    likePost: likePost,
  },
};

module.exports = resolvers;
