/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
"use strict";
const { Model } = require("sequelize");
const { Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static findAllTodos() {
      return this.findAll();
    }

    static addTodo({ title, dueDate, completed }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
      });
    }

    markAsCompleted() {
      return this.update({ completed: true });
    }

    setCompletionStatus(status) {
      return this.update({ completed: status });
    }

    static async dueLater() {
      const todos = await this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
        },
      });
      return todos;
    }

    static async dueToday() {
      const todos = await this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
        },
      });
      return todos;
    }

    static async overdue() {
      const todos = await this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
        },
      });
      return todos;
    }

    static async remove(id) {
      return this.destroy({
        where: {
          id: id,
        },
      });
    }

    static async completed() {
      const todos = await this.findAll({
        where: {
          completed: true,
        },
      });
      return todos;
    }
  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
