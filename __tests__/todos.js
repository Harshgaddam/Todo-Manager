/* eslint-disable no-const-assign */
/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });

  test("Sign Up", async () => {
    const res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/users").send({
      username: "user@test.com",
      email: "user@test.com",
      password: "1234",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Creates a new todo", async () => {
    const agent = request.agent(server);
    await login(agent, "user@test.com", "1234");
    const res = await agent.get("/todos");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Marks a todo with the given ID as complete", async () => {
    const agent = request.agent(server);
    await login(agent, "user@test.com", "1234");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupResponse = JSON.parse(groupResponse.text);
    const dueToday = parsedGroupResponse.dueToday.length;
    const latestTodo = parsedGroupResponse.dueToday[dueToday - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed: true,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  test("Deletes a todo with the given ID", async () => {
    const agent = request.agent(server);
    await login(agent, "user@test.com", "1234");
    let res = await agent.get("/todos");
    let csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupResponse = JSON.parse(groupResponse.text);

    expect(parsedGroupResponse.dueToday).toBeDefined();

    const dueToday = parsedGroupResponse.dueToday.length;
    const latestTodo = parsedGroupResponse.dueToday[dueToday - 1];

    res = await agent.get("/todos");
    csrfToken = extractCsrfToken(res);

    const deleteResponse = await agent.delete(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    });
    expect(deleteResponse.statusCode).toBe(422);
  });
});
