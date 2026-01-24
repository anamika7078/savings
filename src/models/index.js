const sequelize = require('../config/db');
const User = require('./User');
const Member = require('./Member');
const Savings = require('./Savings');
const MonthlySavings = require('./MonthlySavings');
const Loan = require('./Loan');
const Repayment = require('./Repayment');
const Fine = require('./Fine');
const FinanceRule = require('./FinanceRule');

const models = {
    User,
    Member,
    Savings,
    MonthlySavings,
    Loan,
    Repayment,
    Fine,
    FinanceRule,
    sequelize
};

Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

User.hasMany(Member, { foreignKey: 'createdBy', as: 'createdMembers' });
Member.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Member.hasMany(Savings, { foreignKey: 'memberId', as: 'savings' });
Savings.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Member.hasMany(MonthlySavings, { foreignKey: 'memberId', as: 'monthlySavings' });
MonthlySavings.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Member.hasMany(Loan, { foreignKey: 'memberId', as: 'loans' });
Loan.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Loan.hasMany(Repayment, { foreignKey: 'loanId', as: 'repayments' });
Repayment.belongsTo(Loan, { foreignKey: 'loanId', as: 'loan' });

Member.hasMany(Repayment, { foreignKey: 'memberId', as: 'repayments' });
Repayment.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Member.hasMany(Fine, { foreignKey: 'memberId', as: 'fines' });
Fine.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Loan.hasMany(Fine, { foreignKey: 'loanId', as: 'fines' });
Fine.belongsTo(Loan, { foreignKey: 'loanId', as: 'loan' });

User.hasMany(Fine, { foreignKey: 'waivedBy', as: 'waivedFines' });
Fine.belongsTo(User, { foreignKey: 'waivedBy', as: 'waiver' });

User.hasMany(FinanceRule, { foreignKey: 'createdBy', as: 'createdRules' });
FinanceRule.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(FinanceRule, { foreignKey: 'updatedBy', as: 'updatedRules' });
FinanceRule.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

module.exports = models;
