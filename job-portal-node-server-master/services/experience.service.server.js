module.exports = function (app) {

    var experienceModel =
        require('./../models/experience/experience.model.server');

    app.get('/api/experience', findAllExperiences);
    app.get('/api/experience/user', findExperienceByUserId);
    app.post('/api/experience', createExperience);
    app.put('/api/experience/:experienceId', updateExperience);
    app.delete('/api/experience/:experienceId', deleteExperience);

    function findAllExperiences(req, res) {
        experienceModel.findAllExperiences()
            .then(function (experiences) {
                res.send(experiences);
            });
    }

    function createExperience(req, res) {
        var experience = req.body;
        if (req.session && req.session['user']) {
            experience['user'] = req.session['user']._id;
            experienceModel.createExperience(experience)
                .then(function (status) {
                    res.send(status);
                });
        } else {
            res.send({status: 'session expired'});
        }
    }


    function findExperienceByUserId(req, res) {
        if (req.session && req.session['user']) {
            var userId = req.session['user']._id;
            experienceModel.findExperienceByUserId(userId)
                .then(function (experience) {
                    res.json(experience);
                });
        } else {
            res.send({status: 'session expired'});
        }
    }

    function updateExperience(req, res) {
        var experience = req.body;
        var experienceId = req.params['experienceId'];
        if (req.session && req.session['user']) {
            experienceModel.updateExperience(experienceId,experience)
                .then(function (status) {
                    res.send(status);
                });
        } else {
            res.send({status: 'session expired'});
        }
    }

    function deleteExperience(req, res) {
        if (req.session && req.session['user']) {
            var id = req.params['experienceId'];
            experienceModel.deleteExperience(id).then(function (status) {
                res.send(status);
            })
        }
        else {
            res.send('session expired');
        }
    }
};
