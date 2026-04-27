// job-portal-node-server-master/services/skill.service.server.js
module.exports = function (app) {

    var skillModel =
        require('./../models/skill/skill.model.server');

    app.get('/api/skill', findAllSkill);
    app.get('/api/skill/user', findSkillByUserId);
    app.post('/api/skill', createSkill);
    app.put('/api/skill/:skillId', updateSkill);
    app.delete('/api/skill/:skillId', deleteSkill);


    function findAllSkill(req, res) {
        skillModel.findAllSkill()
            .then(function (skill) {
                res.send(skill);
            });
    }
    
    function createSkill(req, res) {
        var skill = req.body;
        if (req.session && req.session['user']) {
            skill['user'] = req.session['user']._id;
            skillModel.createSkill(skill)
                .then(function (status) {
                    // Return the created skill data
                    res.send(status);
                });
        } else {
            res.send({ status: 'session expired' });
        }
    }
    
    function findSkillByUserId(req, res) {
        if (req.session && req.session['user']) {
            var userId = req.session['user']._id;
            skillModel.findSkillByUserId(userId)
                .then(function (skill) {
                    res.json(skill);
                });
        } else {
            res.send({ status: 'session expired' });
        }
    }
    
    function updateSkill(req, res) {
        var skill = req.body;
        var skillId = req.params['skillId'];
        if (req.session && req.session['user']) {
            skillModel.updateSkill(skillId, skill)
                .then(function (status) {
                    res.send(status);
                });
        } else {
            res.send({status: 'session expired'});
        }
    }
    

    function deleteSkill(req, res) {
        if (req.session && req.session['user']) {
            var id = req.params['skillId'];
            skillModel.deleteSkill(id).then(function (status) {
                res.send(status);
            })

        }
        else {
            res.send('session expired');
        }
    }
};
