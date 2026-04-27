// routes/filter.routes.server.js
module.exports = function (app) {
const FilterModel = require('./../models/filters/filter.model.server');

app.post('/api/filter', (req, res) => {
  const userId = req.session['user']._id;
  const filter = req.body;
  FilterModel.createFilter(userId, filter)
    .then(filter => res.json(filter))
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

app.get('/api/filter', (req, res) => {
  const userId = req.session['user']._id;
  FilterModel.findFiltersByUser(userId)
    .then(filters => res.json(filters))
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});

app.delete('/api/filter/:filterId', (req, res) => {
  const filterId = req.params.filterId;
  FilterModel.deleteFilter(filterId)
    .then(() => res.sendStatus(200))
    .catch(error => res.status(500).json({ error: 'Internal Server Error' }));
});


}
