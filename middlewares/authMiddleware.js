exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
      return next();
    }
    req.flash('error', 'Please login to access this page');
    res.redirect('/login');
  };
  
  // Middleware to set local variables for templates
  exports.setLocals = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
  };
  