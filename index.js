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
  host: "localhost",
  user: "root",
  password: "",
  database: "passwardz",
  port: 3306,
});

//check database connection
db.connect((err) => {
  if (err) {
    console.log(err, "db connection err");
  }
  console.log("database connected");
});

app.use(express.json());

const checkEmailExists = (email, callback) => {
  const query = `SELECT * FROM user WHERE email = ?`;
  db.query(query, [email], (err, result) => {
    if (err) {
      console.log(err);
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

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    try {
      checkEmailExists(email, async (err, result) => {
        if (err) {
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
              console.log(err);
              return res
                .status(500)
                .json({ error: "Error inserting data into the database" });
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
      console.log(error);
      res.status(500).json({ error: "Error hashing password" });
    }
  }
);

//login route

app.post(`/logins`, async (req, res) => {
  const { password, email } = req.body;
  console.log(password, email);

  try {
    const query = "SELECT * FROM user ";
    const result = await queryDatabase(query, [email, password]);

    const users = result.map((userRow) => {
      const { email: userEmail, password: userPassword } = userRow;
      return { email: userEmail, password: userPassword };
    });
    console.log(users);

    let user = users.find((user) => {
      console.log("fdsfsd", user);
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

    console.log("database eken enne", password);
    console.log("request eken enne ", user.password);

    let isMatch = await bcrypt.compare(password.trim(), user.password.trim());
    console.log(isMatch);

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
    console.log(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to query the database
function queryDatabase(query, params) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

//update data

app.put(`/user/:id`, (req, res) => {
  console.log("up updated data");

  let gID = req.params.id;

  let eMail = req.body.email;
  let userName = req.body.username;
  let passWord = req.body.password;

  let qr = `UPDATE user SET fullname = '${eMail}', email = '${userName}', mobile = '${passWord}'
      WHERE id = ${gID}`;

  db.query(qr, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send({
      message: "Data Updated",
    });
  });
});

//get all data
app.get("/user", (req, res) => {
  let qr = `SELECT * FROM user`;
  db.query(qr, (err, result) => {
    if (err) {
      console.log(err, "errs");
    }
    if (result.length > 0) {
      res.send({
        message: "all user data",
        data: result,
      });
    }
  });
});

//get single data

app.get(`/user/:id`, (req, res) => {
  let gID = req.params.id;
  let qr = `select * from user where id = ${gID}`;

  db.query(qr, (err, result) => {
    if (err) {
      console.log(err);
    }
    if (result.length > 0) {
      res.send({
        message: "get single data",
        data: result,
      });
    } else {
      res.send({
        message: "data not found",
      });
    }
  });
});

//post data

app.post("/user", (req, res) => {
  console.log("post data");
  //   console.log(req.body, "createdata");

  let eMail = req.body.email;
  let userName = req.body.username;
  let passWord = req.body.password;

  let qr = `insert into user(email,username,password)
              values('${eMail}','${userName}', '${passWord}')`;

  db.query(qr, (err, result) => {
    if (err) {
      console.log(err);
    }
    console.log(result, "result");
    res.send({
      message: "data inserted",
    });
  });
});

//delete single data
app.delete(`/user/:id`, (req, res) => {
  let qid = req.params.id;
  let qr = `delete from user where id = '${qid}' `;
  db.query(qr, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send({
      message: "data deleted",
    });
  });
});



// const model = require("./path/to/your/model"); // Replace with the actual path

// // API endpoint for prediction
// app.post("/predict", async (req, res) => {
//   try {

//     // Extract input data from the request body
//     const input_data = req.body.input_data; // Replace with your input data format

//     // Perform prediction using the model
//     const prediction = model.predict(input_data);

//     // Return the prediction result as a response
//     res.json({ prediction });
//   } catch (error) {
//     console.error("Error during prediction:", error);
//     res.status(500).json({ error: "Error during prediction" });
//   }
// });


app.listen(3000, () => {});
