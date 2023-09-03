const express = require("express");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
require("dotenv").config();
const cors = require("cors"); // Import the cors middleware

const app = express();

app.use(cors());

app.use(express.json());

const dbConfig = {
  host: "sql.freedb.tech",
  user: "freedb_malithlekamge",
  password: "e?7fbmQzPbSNM2s",
  database: "freedb_passwardz",
  port: 3306,
};

const pool = mysql.createPool(dbConfig);

app.use(async (req, res, next) => { // Changed to async
  try {
    const connection = await pool.getConnection();
    req.dbConnection = connection;
    next();
  } catch (err) {
    console.error("Database connection error:", err);
    res.status(500).json({ error: "Database connection error" });
  }
});

app.post(
  "/signup",
  [
    check("email", "Please provide a valid email").isEmail(), // Changed error message capitalization
    check("password", "Password should be between 4 to 8 characters").isLength({
      min: 4,
      max: 8,
    }),
  ],
  async (req, res) => {
    const { password, email, username } = req.body;

    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      const [rows] = await req.dbConnection.execute(
        "SELECT * FROM user WHERE email = ?",
        [email]
      );

      if (rows.length > 0) {
        return res.status(409).json({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await req.dbConnection.execute(
        "INSERT INTO user (email, username, password) VALUES (?, ?, ?)",
        [email, username, hashedPassword]
      );

      const token = jwt.sign(
        {
          email,
        },
        process.env.MY_SECRET_KEY,
        { expiresIn: "1h" }
      );
      res.json({
        token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error registering user" });
    } finally {
      req.dbConnection.release(); // Release the database connection
    }
  }
);

app.post("/logins", async (req, res) => {
  const { password, email } = req.body;

  try {
    const [rows] = await req.dbConnection.execute(
      "SELECT * FROM user WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        errors: {
          message: "Invalid email.",
        },
        status: {
          code: "e",
        },
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        errors: {
          message: "Invalid password.",
        },
        status: {
          code: "p",
        },
      });
    }

    const token = jwt.sign(
      {
        email,
      },
      process.env.MY_SECRET_KEY,
      { expiresIn: "1h" }
    );
    res.json({
      message: {
        TEXT: "Login success.",
      },
      status: {
        code: "0",
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    req.dbConnection.release(); // Release the database connection
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
