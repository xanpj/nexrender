'use strict';

const express       = require('express');
const bodyParser    = require('body-parser');
const morgan        = require('morgan');
const router        = require('./routers/');

let app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('tiny'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/api', router);

module.exports = {
    start: function(port) {
        app.listen(port, function () {
            console.log('nexrender.server is listening on port:', port);
        });
    }
};
