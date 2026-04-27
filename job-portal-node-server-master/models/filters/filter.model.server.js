// services/filter.service.server.js

var mongoose =
    require('mongoose');
const filterSchema = require('./filter.schema.server');
var FilterModel = mongoose
    .model('FilterModel', filterSchema);

function createFilter(userId, filter) {
  filter.userId = userId;
  return FilterModel.create(filter);
}

function findFiltersByUser(userId) {
  return FilterModel.find({ userId });
}

function deleteFilter(filterId) {
  return FilterModel.findByIdAndDelete(filterId);
}

module.exports = {
  createFilter:createFilter,
  findFiltersByUser:findFiltersByUser,
  deleteFilter:deleteFilter
};
