const pg = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const devConfig = {
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
};

const prodConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
};

const pool = new pg.Pool(
  process.env.NODE_ENV === "production" ? prodConfig : devConfig
);

module.exports = pool;