const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const session = require('express-session');
const flash = require('connect-flash');
const dotenv = require('dotenv');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const {app,server} = require("./socket/socketHandler");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

// Import middleware
const { setLocals } = require('./middlewares/authMiddleware');

// Import database
const sequelize = require('./config/db');


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));


app.use(flash());
app.use(setLocals);

// Routes
app.use('/', authRoutes);
app.use('/', chatRoutes);
app.use('/', indexRouter);
app.use('/users', usersRouter);


// Sync database models
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synchronized');
    
    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database synchronization error:', err);
  });

// Handle 404
app.use((req, res, next) => {
  next(createError(404));
});

// Handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', { title: 'Server Error', error: err });
});

module.exports = app;
