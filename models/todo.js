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

    //

    static findAllTodos() {
      try {
        return this.findAll();
      } catch (error) {
        console.log(error);
        return error;
      }
    }

    static addTodo({ title, dueDate, completed }) {
      try {
        return this.create({
          title: title,
          dueDate: dueDate,
          completed: false,
        });
      } catch (error) {
        console.log(error);
        return error;
      }
    }

    markAsCompleted() {
      return this.update({ completed: true });
    }

    static async dueLAter() {
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

    //
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
