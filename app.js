/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("ssh! this is a secret key"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({ secret: "my-secret-key", cookie: { maxAge: 24 * 60 * 60 * 1000 } })
);

app.use(passport.initialize());
app.use(passport.session());

const saltRounds = 10;

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const isValid = bcrypt.compare(password, user.password);
          if (!isValid) {
            return done("Invalid username or password");
          }
          return done(null, user);
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async function (request, response) {
  response.render("index", {
    title: "Todo List",
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedInUser = request.user.id;
    const todos = await Todo.findAllTodos(loggedInUser);
    const overDue = await Todo.overdue(loggedInUser);
    const dueToday = await Todo.dueToday(loggedInUser);
    const dueLater = await Todo.dueLater(loggedInUser);
    const completed = await Todo.completed(loggedInUser);
    if (request.accepts("html")) {
      response.render("todos", {
        allTodos: todos,
        overDue: overDue,
        dueToday: dueToday,
        dueLater: dueLater,
        completed: completed,
        csrfToken: request.csrfToken(),
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
        dueDate: request.body.dueDate,
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
      (completed = request.body.completed)
    );
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  try {
    const deletedTodo = await Todo.remove(request.params.id);
    return response.json({ success: true });
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/signup", async function (request, response) {
  response.render("signup", {
    title: "Sign Up",
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async function (request, response) {
  const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPassword,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/todos");
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/login", async function (request, response) {
  response.render("login", {
    title: "Sign-In",
    csrfToken: request.csrfToken(),
  });
});

app.post(
  "/session",
  passport.authenticate("local", { failureRedirect: "/login" }),
  async function (request, response) {
    response.redirect("/todos");
  }
);

app.get("/userdata", async function (request, response) {
  try {
    const user = await User.findAll();
    return response.json(user);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/signout", async function (request, response, next) {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    response.redirect("/");
  });
});

module.exports = app;
