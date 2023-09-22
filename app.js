/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
const express = require("express"); // import express application
const app = express(); // create express application
const { Todo, User } = require("./models"); // import Todo model
const bodyParser = require("body-parser"); // body parser is a middleware that allows us to access request body as req.body
const path = require("path"); // path is a core module that provides utilities for working with file and directory paths
const passport = require("passport"); // passport is a middleware that allows us to authenticate requests
const LocalStrategy = require("passport-local").Strategy; // Strategy for authenticating with a username and password
const session = require("express-session"); // express-session is a middleware that allows us to store session data on the server side
const connectEnsureLogin = require("connect-ensure-login"); // connect-ensure-login is a middleware that ensures that a user is logged in before allowing access to the route
const bcrypt = require("bcrypt"); // bcrypt is a library for hashing and comparing passwords
const flash = require("connect-flash"); // connect-flash is a middleware that allows us to send messages to the user
const { stat } = require("fs"); // fs is a core module that provides utilities for working with the file system

app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded

app.set("view engine", "ejs"); // set view engine to ejs
app.use(express.static(path.join(__dirname, "public"))); // set path for static files

app.use(
  session({ secret: "my-secret-key", cookie: { maxAge: 24 * 60 * 60 * 1000 } }) // set session options and secret key for signing the session ID cookie
);

app.use(flash()); // use connect-flash middleware
app.use(function (request, response, next) {
  response.locals.messages = request.flash(); // set messages to be available in all views
  next(); // call next middleware
});

app.use(passport.initialize()); // initialize passport
app.use(passport.session()); // use passport session

const saltRounds = 10; // salt rounds for hashing password

// passport local strategy for local-login, local refers to this app as opposed to google or facebook login etc.
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          if (!user) {
            return done(null, false, { message: "User not found" }); // done is a callback that has 3 parameters, error, user, and info
          }
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Incorrect password" });
          }
          return done(null, user); // if no error, return user
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);

// serialize user into the session, serialize means to convert an object into a string
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// deserialize user from the session, deserialize means to convert a string into an object
passport.deserializeUser((id, done) => {
  User.findByPk(id) // findByPk is a sequelize method for finding one element by its primary key
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async function (request, response) {
  response.render("login", {
    title: "Todo List",
  });
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(), // ensureLoggedIn is a middleware that ensures that a user is logged in before allowing access to the route
  async (request, response) => {
    const loggedInUser = request.user.id;
    const todos = await Todo.findAllTodos(loggedInUser);
    const overDue = await Todo.overdue(loggedInUser);
    const dueToday = await Todo.dueToday(loggedInUser);
    const dueLater = await Todo.dueLater(loggedInUser);
    const completed = await Todo.completed(loggedInUser);
    if (request.accepts("html")) {
      // if the request accepts html, render the todos view
      response.render("todos", {
        allTodos: todos,
        overDue: overDue,
        dueToday: dueToday,
        dueLater: dueLater,
        completed: completed,
        userId: request.user.id,
        UserName: request.user.firstName + " " + request.user.lastName,
      });
    } else {
      response.json({
        todos,
        overDue,
        dueToday,
        dueLater,
        completed,
      });
    }
  }
);

app.get("/todos/:id", async function (request, response) {
  try {
    /*
    params is an object containing properties mapped to the named route “parameters”. For example,
    if you have the route /user/:name, then the “name” property is available as req.params.name.
    This object defaults to {}.
    */
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo = await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate ? request.body.dueDate : new Date(),
        complete: request.body.complete,
        userId: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.put("/todos/:id", async function (request, response) {
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.setCompletionStatus(
      (completed = request.body.completed) // body is a property of request object that contains the parsed body of the request
    );
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  try {
    // delete todo by id and user id to ensure that a user can only delete their own todos
    const deletedTodo = await Todo.remove(request.params.id, request.user.id);
    return response.json({ success: true });
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/signup", async function (request, response) {
  response.render("signup", {
    title: "Sign Up",
  });
});

app.post("/users", async function (request, response) {
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds); // hash password using bcrypt library and salt rounds of 10 for security
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPassword,
    });
    request.login(user, (err) => {
      if (err) {
        response.status(422).json(err);
      }
      response.redirect("/todos");
    });
  } catch (error) {
    request.flash(
      "error",
      error.errors.map((error) => error.message) // map through errors and return error message
    );
    response.redirect("/signup");
  }
});

app.get("/login", async function (request, response) {
  response.render("login", {
    title: "Sign-In",
  });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async function (request, response, next) {
    if (
      request.user.firstName === "Harsh" &&
      request.user.lastName === "Vardhan" &&
      request.user.email === "harsh@gmail.com"
    ) {
      response.redirect("/admin");
    } else {
      response.redirect("/todos");
    }
    next();
  }
);

app.get("/admin", async function (request, response) {
  response.render("admin", {
    title: "Admin",
  });
});

app.get("/signout", async function (request, response, next) {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    response.redirect("/");
  });
});

app.delete("/deleteAccount/:id", async function (request, response) {
  try {
    const deletedTodos = await Todo.removeTodos(request.params.id);
    const deletedUser = await User.removeUser(request.params.id);
    return response.json({ success: true }); // return json response with success message
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/deleteAccounts", async function (request, response) {
  try {
    const deletedTodos = await Todo.removeAllTodos();
    const deletedUser = await User.removeAllUsers();
    return response.json({ success: true });
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

// catch all route
app.get("/*", function (request, response) {
  response.redirect("/");
});

module.exports = app; // export app
