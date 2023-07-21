/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
/* eslint-disable quotes */
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Todo, {
        foreignKey: "userId",
      });
    }
    static async removeUser(userId) {
      const user = await this.findByPk(userId);
      return user.destroy();
    }
  }

  User.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
        validate: {
          unique: function (mailId) {
            return User.findOne({ where: { email: mailId } }).then((user) => {
              if (user) {
                throw new Error("Email already in use");
              }
            });
          },
        },
      },
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
