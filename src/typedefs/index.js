const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type Success {
    success: Boolean!
  }

  type User {
    user_id: ID!
    email: String
    username: String!
    created_at: DateTime!
    profile_pic_src: String
    following: [User]
    followers: [User]
    posts: [Post]
    comments: [Comment]
    saved_posts: [Post]
  }

  type Community {
    community_id: Int!
    name: String!
    title: String!
    description: String!
    created_at: DateTime!
    type: String!
    logo_src: String
    moderators: [User]
    members: [User]
    posts: [Post]
  }

  interface Post {
    post_id: Int!
    title: String!
    created_at: DateTime!
    created_since: String
    poster: User
    community: Community
    reactions: Reactions
    comments_info: CommentsInfo
  }

  type TextPost implements Post {
    post_id: Int!
    title: String!
    created_at: DateTime!
    created_since: String
    poster: User
    community: Community
    reactions: Reactions
    comments_info: CommentsInfo
    description: String!
  }

  type MediaPost implements Post {
    post_id: Int!
    title: String!
    created_at: DateTime!
    created_since: String
    poster: User
    community: Community
    reactions: Reactions
    comments_info: CommentsInfo
    media_src: String!
  }

  type Reactions {
    likes: Int!
    dislikes: Int!
    total: Int!
    auth_user_reaction: String
  }

  type CommentsInfo {
    total: Int!
    comment_ids: [Int]
  }

  type Comment {
    comment_id: Int!
    parent_comment_id: Int
    post_id: Int!
    message: String!
    created_since: String
    commenter: User
    reactions: Reactions
    child_comments: [Comment]
  }

  type Message {
    message_id: Int!
    sender: User!
    recipient: User!
    message: String!
    sent_at: DateTime!
    is_read: Boolean!
  }

  type Conversation {
    user: User!
    messages: [Message]
  }

  union Notification = Message | Comment

  union SearchResult = User | Community | TextPost | MediaPost

  # Queries
  type Query {
    # User queries
    user(username: String!): User
    authUser: User

    # Community queries
    communities: [Community]
    community(name: String!): Community

    # Post queries
    homePagePosts(sort: String!): [Post]
    explorePagePosts(sort: String!): [Post]
    post(post_id: Int!): Post

    # Comment queries
    postComments(post_id: Int!): [Comment]
    comment(comment_id: Int!): Comment

    # Message queries
    conversations: [Conversation]
    conversation(username: String!): [Message]

    # Notification queries
    notifications: [Notification]

    # Search queries
    search(term: String!): [SearchResult]
  }

  # Mutations
  type Mutation {
    # Auth mutations
    signup(username: String!, password: String!): Success
    registerOAuth(token: String!, username: String!): Success
    login(username: String!, password: String!): Success
    logout: Success

    # User mutations
    follow(username: String!): User
    unfollow(username: String!): User
    removeFollower(username: String!): User
    changeEmail(password: String!, new_email: String!): User
    changeUsername(username: String!): User
    changeProfilePic(profile_pic: Upload!): User
    changePassword(current_password: String!, new_password: String!): User
    deleteAccount(password: String!): Success

    # Community mutations
    join(community_id: Int!): Community
    leave(community_id: Int!): Community
    createCommunity(
      name: String!
      title: String!
      description: String!
      type: String!
      logo: Upload
    ): Community
    editCommunity(
      community_id: Int!
      title: String
      description: String
      type: String
      logo: Upload
    ): Community

    # Post mutations
    addTextPost(title: String!, description: String!, community_id: Int!): Post
    addMediaPost(title: String!, media: Upload!, community_id: Int!): Post
    deletePost(post_id: Int!): Post
    addPostReaction(post_id: Int!, reaction: String!): Post
    deletePostReaction(post_id: Int!): Post
    savePost(post_id: Int!): Post
    unsavePost(post_id: Int!): Post

    # Comment mutations
    addComment(parent_comment_id: Int, post_id: Int!, message: String!): Comment
    deleteComment(comment_id: Int!): Comment
    addCommentReaction(comment_id: Int!, reaction: String!): Comment
    deleteCommentReaction(comment_id: Int!): Comment
    readComments(comment_ids: [Int]!): [Comment]

    # Message mutations
    sendMessage(recipient: String!, message: String!): Message
    readMessages(message_ids: [Int]!): [Message]
  }

  type Subscription {
    newMessage: Message
    newNotification: Notification
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;

module.exports = typeDefs;
