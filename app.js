const express = require("express");
const app = express();
const { Todo } = require("./models");
const bodyParser = require("body-parser");
app.use(bodyParser.json());

app.set("view engine", "ejs");

app.get("/", async (request, response) => {
  const todos = await Todo.findAllTodos();
  if (request.accepts("html")) {
    return response.render("index", { allTodos: todos });
  }
  return response.json(todos);
});

app.get("/", function (request, response) {
  response.send("Hello World");
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
    return response.json(todo);
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
  const todo = await Todo.findByPk(request.params.id);
  try {
    const deletedTodo = await todo.destroy();
    return response.json(deletedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
