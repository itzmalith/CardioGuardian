const express = require("express");
const bodyparser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const { check, validationResult } = require("express-validator");

const bcrypt = require("bcrypt");
const JWT = require("jsonwebtoken");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(bodyparser.json());

const db = mysql.createConnection({
  host: "sql.freedb.tech",
  user: "freedb_malithlekamge",
  password: "e?7fbmQzPbSNM2s",
  database: "freedb_passwardz",
  port: 3306,
});

// Check database connection
db.connect((err) => {
  if (err) {
    console.error(err, "db connection error");
  } else {
    console.log("Database connected");
  }
});

app.use(express.json());

const checkEmailExists = (email, callback) => {
  const query = `SELECT * FROM user WHERE email = ?`;
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error(err);
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

app.post(
  `/signup`,
  [
    check("email", "please provide a valid email").isEmail(),
    check("password", "password should be between 4 to 8 characters").isLength({
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

      checkEmailExists(email, async (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Database error" });
        }

        if (result.length > 0) {
          return res.status(409).json({ error: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new SQL query to insert the user data
        let insertQuery = `INSERT INTO user (email, username, password) VALUES (?, ?, ?)`;

        // Execute the SQL query to insert the data into the database
        db.query(
          insertQuery,
          [email, username, hashedPassword],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Error inserting data into the database" });
            }
            console.log("User registered:", result);

            const token = JWT.sign(
              {
                email,
              },
              process.env.MY_SECRET_KEY,
              { expiresIn: 3600000 }
            );
            res.json({
              token,
            });
          }
        );
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error hashing password" });
    }
  }
);

// Login route

app.post(`/logins`, async (req, res) => {
  const { password, email } = req.body;

  try {
    const query = "SELECT * FROM user ";
    const result = await queryDatabase(query, [email, password]);

    const users = result.map((userRow) => {
      const { email: userEmail, password: userPassword } = userRow;
      return { email: userEmail, password: userPassword };
    });

    let user = users.find((user) => {
      return user.email === email;
    });

    if (!user) {
      return res.status(400).json({
        errors: {
          message: "Invalid email.",
        },
        status: {
          code: "e",
        },
      });
    }

    let isMatch = await bcrypt.compare(password.trim(), user.password.trim());

    if (isMatch === false) {
      return res.status(400).json({
        errors: {
          message: "Invalid password.",
        },
        status: {
          code: "p",
        },
      });
    }

    const token = await JWT.sign(
      {
        email,
      },
      process.env.MY_SECRET_KEY,
      { expiresIn: 3600000 }
    );
    res.json({
      message: {
        TEXT: "login success.",
      },
      status: {
        code: "0",
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to query the database
function queryDatabase(query, params) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, result) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
