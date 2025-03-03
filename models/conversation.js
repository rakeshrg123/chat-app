const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db'); // Adjust based on your Sequelize setup
const User = require('./user'); // Adjust based on your User model path

class Conversation extends Model {}

Conversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lastMessageText: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
  recipientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    lastMessageSeen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Conversation',
    timestamps: true,
  }
);

const ConversationParticipants = sequelize.define('ConversationParticipants', {}, { timestamps: false });
Conversation.belongsToMany(User, { through: ConversationParticipants, as: 'participants' });
User.belongsToMany(Conversation, { through: ConversationParticipants });

Conversation.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = Conversation;
