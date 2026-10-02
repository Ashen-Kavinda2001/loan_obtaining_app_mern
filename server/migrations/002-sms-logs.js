// One row per receipt SMS (models/SmsLog.js). A new table: existing tables are not touched or locked.
const { tableExists } = require('../db/migrator');

module.exports.up = async ({ qi, DataTypes }) => {
  if (await tableExists(qi, 'SmsLogs')) return;
  await qi.createTable('SmsLogs', {
    id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    loanId:           { type: DataTypes.INTEGER, allowNull: true },
    paymentId:        { type: DataTypes.INTEGER, allowNull: true },
    memberId:         { type: DataTypes.INTEGER, allowNull: true },
    phone:            { type: DataTypes.STRING(20), allowNull: true },
    message:          { type: DataTypes.TEXT, allowNull: false },
    status:           { type: DataTypes.STRING(16), allowNull: false },
    error:            { type: DataTypes.STRING(255), allowNull: true },
    providerResponse: { type: DataTypes.TEXT, allowNull: true },
    attempts:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastAttemptAt:    { type: DataTypes.DATE, allowNull: true },
    resentBy:         { type: DataTypes.INTEGER, allowNull: true },
    createdAt:        { type: DataTypes.DATE, allowNull: false },
    updatedAt:        { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addIndex('SmsLogs', ['loanId'], { name: 'sms_logs_loan' });
  await qi.addIndex('SmsLogs', ['status', 'createdAt'], { name: 'sms_logs_status_created' });
};
