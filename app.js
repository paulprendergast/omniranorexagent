const express = require('express');
const path = require('path');
const chalk = require('chalk');
const debug = require('debug')('app');
const morgan = require('morgan');
//const ejs = require('ejs');

const PORT = process.env.PORT || 4001;
const app = express();

//middleware
app.use(express.static(path.join(__dirname, '/src/')));
app.use(morgan('tiny'));


app.set('views', path.join(__dirname, 'src', 'views'));
app.set('images', path.join(__dirname, 'src', 'images'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(PORT, () => {
    debug(`Listening on port: ${chalk.green(PORT)}`);
});