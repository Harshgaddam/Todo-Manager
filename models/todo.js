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
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static findAllTodos() {
      return this.findAll();
    }

    static addTodo({ title, dueDate, completed, userId }) {
      return this.create({
        title: title,
        dueDate: dueDate,
        completed: false,
        userId: userId,
      });
    }

    markAsCompleted() {
      return this.update({ completed: true });
    }

    setCompletionStatus(status) {
      return this.update({ completed: status });
    }

    static async dueLater(userId) {
      const todos = await this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          userId: userId,
          completed: false,
        },
      });
      return todos;
    }

    static async dueToday(userId) {
      const todos = await this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          userId: userId,
          completed: false,
        },
      });
      return todos;
    }

    static async overdue(userId) {
      const todos = await this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          userId: userId,
          completed: false,
        },
      });
      return todos;
    }

    static async remove(id, userId) {
      return this.destroy({
        where: {
          id: id,
          userId: userId,
        },
      });
    }

    static async completed(userId) {
      const todos = await this.findAll({
        where: {
          completed: true,
        },
        userId: userId,
      });
      return todos;
    }

    static removeTodos(userId) {
      return this.destroy({
        where: {
          userId: userId,
        },
      });
    }

    static removeAllTodos() {
      return this.destroy({
        where: {},
        truncate: true,
      });
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
