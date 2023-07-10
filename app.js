/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
const express = require("express");
const app = express();
const { Todo } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
var csrf = require("csurf");
var cookieParser = require("cookie-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("ssh! this is a secret key"));
app.use(csrf({ cookie: true }));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (request, response) => {
  const todos = await Todo.findAllTodos();
  const overDue = await Todo.overdue();
  const dueToday = await Todo.dueToday();
  const dueLater = await Todo.dueLater();
  if (request.accepts("html")) {
    response.render("index", {
      allTodos: todos,
      overDue: overDue,
      dueToday: dueToday,
      dueLater: dueLater,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({
      todos,
      overDue,
      dueToday,
      dueLater,
    });
  }
});

app.get("/todos", async function (_request, response) {
  console.log("Processing list of all Todos ...");
  const todos = await Todo.findAllTodos();
  return response.json(todos);
});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async function (request, response) {
  try {
    const todo = await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
      complete: request.body.complete,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id/markAsCompleted", async function (request, response) {
  const todo = await Todo.findByPk(request.params.id);
  try {
    const updatedTodo = await todo.markAsCompleted();
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

module.exports = app;
